import {
  OUTPUT_AGGREGATE_TABLES,
  SENSOR_AGGREGATE_TABLES,
} from "@sproot/common/dist/api/v2/QueryTypes";
import { ISystemRepository } from "@sproot/common/dist/database/ISprootDB";
import { Knex } from "knex";
import * as winston from "winston";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class SystemRepository extends BaseKnexRepository implements ISystemRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getDatabaseSizeAsync(): Promise<number> {
    const result = await this.connection.raw(
      "SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) AS size",
    );
    return this.parseSizeValue(this.getFirstRawRow(result)?.["size"]);
  }

  async backupDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    outputFile: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.backupDatabaseArchiveAsync(host, port, user, password, outputFile, logger);
  }

  override async validateBackupArchiveAsync(
    inputFile: string,
    logger: winston.Logger,
  ): Promise<void> {
    return super.validateBackupArchiveAsync(inputFile, logger);
  }

  async swapRestoreDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    inputFile: string,
    logger: winston.Logger,
  ): Promise<void> {
    const dbName = this.connection.client.database();
    const restoreDbName = `${dbName}-restore`;
    const oldDbName = `${dbName}-old`;
    let cleanupNeeded = false;

    try {
      await super.validateBackupArchiveAsync(inputFile, logger);

      await this.dropDatabaseIfExistsAsync(host, port, user, password, oldDbName, logger);
      await this.dropDatabaseIfExistsAsync(host, port, user, password, restoreDbName, logger);
      await this.createDatabaseAsync(host, port, user, password, restoreDbName, logger);
      cleanupNeeded = true;

      await this.restoreDatabaseArchiveAsync(
        host,
        port,
        user,
        password,
        inputFile,
        restoreDbName,
        logger,
      );

      await this.terminateOtherConnectionsAsync(host, port, user, password, dbName, logger);
      await this.renameDatabaseAsync(host, port, user, password, dbName, oldDbName, logger);
      await this.renameDatabaseAsync(host, port, user, password, restoreDbName, dbName, logger);
    } catch (error) {
      if (cleanupNeeded) {
        try {
          await this.dropDatabaseIfExistsAsync(host, port, user, password, restoreDbName, logger);
          await this.dropDatabaseIfExistsAsync(host, port, user, password, oldDbName, logger);
          logger.warn("Cleaned up orphaned databases after failed restore");
        } catch (cleanupError) {
          logger.error(
            `Failed to clean up orphaned databases after restore error: ${(cleanupError as Error).message}`,
          );
        }
      }
      throw error;
    }
  }

  async deleteOldDatabaseAsync(logger: winston.Logger): Promise<void> {
    const dbName = this.connection.client.database();
    const oldDbName = `${dbName}-old`;
    const host = process.env["DATABASE_HOST"]!;
    const port = parseInt(process.env["DATABASE_PORT"]!);
    const user = process.env["DATABASE_USER"]!;
    const password = process.env["DATABASE_PASSWORD"]!;

    try {
      await this.dropDatabaseIfExistsAsync(host, port, user, password, oldDbName, logger);
      logger.info(`Deleted old database: ${oldDbName}`);
    } catch (err) {
      logger.error(`Failed to delete old database ${oldDbName}:`, err);
    }
  }

  async refreshAllAggregateTablesAsync(logger: winston.Logger): Promise<void> {
    logger.info("Refreshing aggregate tables...");

    const aggregateTables = [
      ...Object.entries(SENSOR_AGGREGATE_TABLES).map(([, name]) => ({
        name,
        rawTable: "sensor_data",
      })),
      ...Object.entries(OUTPUT_AGGREGATE_TABLES).map(([, name]) => ({
        name,
        rawTable: "output_data",
      })),
    ];

    for (const aggregateTable of aggregateTables) {
      try {
        const result = await this.refreshAggregateChunksAsync(
          aggregateTable.name,
          aggregateTable.rawTable,
          logger,
        );
        if (result) {
          logger.info(`Refreshed ${result.tableName}: ${result.minStart} to ${result.maxEnd}`);
        }
      } catch (error) {
        logger.error(`Failed to refresh aggregate table ${aggregateTable.name}:`, error);
      }
    }

    logger.info("Aggregate table refresh complete");
  }

  private async refreshAggregateChunksAsync(
    tableName: string,
    rawTable: string,
    logger: winston.Logger,
  ): Promise<{ tableName: string; minStart: string; maxEnd: string } | null> {
    const oldestResult = await this.connection(rawTable).min("logTime as oldest");
    const oldestTime = oldestResult[0]?.["oldest"];
    if (!oldestTime) {
      return null;
    }

    let windowEnd = new Date();
    let windowStart = this.alignToMonth(windowEnd);
    let minStart: string | null = null;
    let maxEnd: string | null = null;

    while (windowStart > oldestTime) {
      const startStr = this.formatDbDate(windowStart);
      const endStr = this.formatDbDate(windowEnd);
      try {
        await this.connection.raw(
          `CALL refresh_continuous_aggregate('${tableName}', '${startStr}', '${endStr}');`,
        );
        if (minStart === null || startStr < minStart) {
          minStart = startStr;
        }
        if (maxEnd === null || endStr > maxEnd) {
          maxEnd = endStr;
        }
      } catch (error) {
        logger.error(`Failed to refresh ${tableName} chunk ${startStr} to ${endStr}:`, error);
      }
      windowEnd = windowStart;
      windowStart = new Date(windowStart.getFullYear(), windowStart.getMonth() - 1, 1, 0, 0, 0, 0);
    }

    if (windowStart <= oldestTime) {
      const startStr = this.formatDbDate(oldestTime);
      const endStr = this.formatDbDate(windowEnd);
      try {
        await this.connection.raw(
          `CALL refresh_continuous_aggregate('${tableName}', '${startStr}', '${endStr}');`,
        );
        if (minStart === null || startStr < minStart) {
          minStart = startStr;
        }
        if (maxEnd === null || endStr > maxEnd) {
          maxEnd = endStr;
        }
      } catch (error) {
        logger.error(`Failed to refresh ${tableName} chunk ${startStr} to ${endStr}:`, error);
      }
    }

    if (minStart === null || maxEnd === null) {
      return null;
    }

    return { tableName, minStart, maxEnd };
  }

  private alignToMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  private formatDbDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
