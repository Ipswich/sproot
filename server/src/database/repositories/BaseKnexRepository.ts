import {
  DEFAULT_AGGREGATES,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  OUTPUT_AGGREGATE_TABLES,
  OutputDataQueryRequest,
  OutputDataQueryResponse,
  SENSOR_AGGREGATE_TABLES,
  SensorDataQueryRequest,
  SensorDataQueryResponse,
} from "@sproot/sproot-common/dist/api/v2/QueryTypes";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { Knex } from "knex";
import fs from "node:fs";
import { spawn } from "node:child_process";
import * as winston from "winston";
import { dbToIso } from "../../utils/dateUtils";
import { formatOutputDataQueryRows, formatSensorDataQueryRows } from "../databaseQueryUtils";
import { buildOutputRawQuery, buildSensorRawQuery } from "../rawDataQueryHelpers";

export abstract class BaseKnexRepository {
  protected readonly connection: Knex;

  protected constructor(connection: Knex) {
    this.connection = connection;
  }

  protected async insertAndGetIdAsync(
    tableName: string,
    values: Record<string, unknown>,
  ): Promise<number> {
    const result = await this.connection(tableName)
      .insert(values)
      .returning<{ id: number }[]>("id");
    if (!result[0]?.id) {
      throw new Error(`Insert into "${tableName}" returned no id`);
    }
    return result[0].id;
  }

  protected getCurrentTimestampValue(): Date {
    return new Date();
  }

  protected normalizeReadings(readings: SDBReading[], toIsoString: boolean): SDBReading[] {
    return readings.map((reading) => ({
      ...reading,
      logTime: this.normalizeLogTime(reading.logTime, toIsoString),
    }));
  }

  protected normalizeOutputStates(
    states: SDBOutputState[],
    toIsoString: boolean,
  ): SDBOutputState[] {
    return states.map((state) => ({
      ...state,
      logTime: this.normalizeLogTime(state.logTime, toIsoString),
    }));
  }

  protected normalizeSensors(sensors: SDBSensor[]): SDBSensor[] {
    return sensors.map((sensor) => ({
      ...sensor,
      lowCalibrationPoint: this.normalizeNullableNumber(sensor.lowCalibrationPoint),
      highCalibrationPoint: this.normalizeNullableNumber(sensor.highCalibrationPoint),
    }));
  }

  protected normalizeLogTime(
    value: string | Date | null | undefined,
    toIsoString: boolean,
  ): string {
    const isoValue = dbToIso(value);
    if (!isoValue) {
      return "";
    }

    if (toIsoString || value instanceof Date) {
      return isoValue;
    }

    return typeof value === "string" ? value : isoValue;
  }

  protected mergeSensorReadings(baseRows: SDBReading[], tailRows: SDBReading[]): SDBReading[] {
    const mergedRows = new Map<string, SDBReading>();
    for (const row of baseRows) {
      mergedRows.set(`${row.metric}:${dbToIso(row.logTime) ?? row.logTime}`, row);
    }
    for (const row of tailRows) {
      mergedRows.set(`${row.metric}:${dbToIso(row.logTime) ?? row.logTime}`, row);
    }

    return [...mergedRows.values()].sort((left, right) => {
      const timeDifference = new Date(left.logTime).getTime() - new Date(right.logTime).getTime();
      if (timeDifference !== 0) {
        return timeDifference;
      }

      return left.metric.localeCompare(right.metric);
    });
  }

  protected mergeOutputStates(
    baseRows: SDBOutputState[],
    tailRows: SDBOutputState[],
  ): SDBOutputState[] {
    const mergedRows = new Map<string, SDBOutputState>();
    for (const row of baseRows) {
      mergedRows.set(dbToIso(row.logTime) ?? String(row.logTime), row);
    }
    for (const row of tailRows) {
      mergedRows.set(dbToIso(row.logTime) ?? String(row.logTime), row);
    }

    return [...mergedRows.values()].sort(
      (left, right) => new Date(left.logTime).getTime() - new Date(right.logTime).getTime(),
    );
  }

  protected getRawRows<T>(result: unknown): T[] {
    return Array.isArray((result as { rows?: T[] })?.rows) ? (result as { rows: T[] }).rows : [];
  }

  protected getFirstRawRow(result: any): Record<string, unknown> | undefined {
    return Array.isArray(result?.rows)
      ? (result.rows[0] as Record<string, unknown> | undefined)
      : undefined;
  }

  protected parseSizeValue(value: unknown): number {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      return parseFloat(value);
    }

    return 0;
  }

  protected normalizeNullableNumber(value: unknown): number | null {
    if (value == null) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "bigint") {
      return Number(value);
    }

    const normalizedValue = Number(value);
    return Number.isFinite(normalizedValue) ? normalizedValue : null;
  }

  protected buildAggregateFilters(
    request: SensorDataQueryRequest | OutputDataQueryRequest,
    idColumnName: "sensor_id" | "output_id",
    readingTypes: string[] | undefined,
  ) {
    const cursor = this.parseCursor(request.cursor);
    const { start, end } = request.timeRange;
    const id = request.id;

    const timeFilter = cursor
      ? this.connection.raw('"bucket" >= ? AND "bucket" < ?', [start, cursor])
      : this.connection.raw('"bucket" BETWEEN ? AND ?', [start, end]);

    const idFilter = this.connection.raw(`"${idColumnName}" = ?`, [id]);

    const metricFilter =
      readingTypes && readingTypes.length > 0
        ? this.connection.raw(
            '"metric" IN (' + readingTypes.map(() => "?").join(", ") + ")",
            readingTypes,
          )
        : this.connection.raw("1=1");

    return this.connection.raw("? AND ? AND ?", [timeFilter, idFilter, metricFilter]);
  }

  protected buildRawFilters(
    request: SensorDataQueryRequest | OutputDataQueryRequest,
    idColumnName: "sensor_id" | "output_id",
    readingTypes: string[] | undefined,
  ) {
    const cursor = this.parseCursor(request.cursor);
    const { start, end } = request.timeRange;
    const id = request.id;

    const timeFilter = cursor
      ? this.connection.raw('"logTime" >= ? AND "logTime" < ?', [start, cursor])
      : this.connection.raw('"logTime" BETWEEN ? AND ?', [start, end]);

    const idFilter = this.connection.raw(`"${idColumnName}" = ?`, [id]);

    const metricFilter =
      readingTypes && readingTypes.length > 0
        ? this.connection.raw(
            '"metric" IN (' + readingTypes.map(() => "?").join(", ") + ")",
            readingTypes,
          )
        : this.connection.raw("1=1");

    return this.connection.raw("? AND ? AND ?", [timeFilter, idFilter, metricFilter]);
  }

  protected async querySensorDataAggregateAsync(
    request: SensorDataQueryRequest,
    aggregateTableName: string,
  ): Promise<SensorDataQueryResponse> {
    const limit = Math.min(request.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const readingTypes = request.readingTypes;
    const whereRaw = this.buildAggregateFilters(request, "sensor_id", readingTypes);

    const query = this.connection(aggregateTableName)
      .select(
        "bucket",
        "sensor_id",
        "metric",
        "units",
        "sample_count",
        "average_data",
        "minimum_data",
        "maximum_data",
        "stddev_data",
        "first_data",
        "last_data",
        this.connection.raw("approx_percentile(?, percentile_sketch) AS percentile_data", [
          request.percentile ?? 0.5,
        ]),
      )
      .where(whereRaw)
      .orderBy("bucket", "DESC")
      .limit(limit + 1);

    const rows = (await query) as Array<Record<string, unknown>>;
    const hasMoreRows = rows.length > limit;
    const truncated = hasMoreRows ? rows.slice(0, limit) : rows;

    let nextCursor: string | undefined;
    if (hasMoreRows && truncated.length > 0) {
      const lastRow = truncated[truncated.length - 1]!;
      const bucketValue = lastRow["bucket"] as string | Date | null | undefined;
      nextCursor = Buffer.from(dbToIso(bucketValue) ?? String(bucketValue)).toString("base64");
    }

    return formatSensorDataQueryRows(
      truncated,
      [...(request.aggregates ?? DEFAULT_AGGREGATES)],
      nextCursor,
    );
  }

  protected async queryOutputDataAggregateAsync(
    request: OutputDataQueryRequest,
    aggregateTableName: string,
  ): Promise<OutputDataQueryResponse> {
    const limit = Math.min(request.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const whereRaw = this.buildAggregateFilters(request, "output_id", undefined);

    const query = this.connection(aggregateTableName)
      .join("outputs", `${aggregateTableName}.output_id`, "outputs.id")
      .select(
        "bucket",
        "output_id",
        this.connection.raw('"outputs"."name" as output_name'),
        this.connection.raw("'%' as output_units"),
        "sample_count",
        "average_value",
        "minimum_value",
        "maximum_value",
        "stddev_value",
        "first_value",
        "last_value",
        this.connection.raw("approx_percentile(?, percentile_sketch) AS percentile_value", [
          request.percentile ?? 0.5,
        ]),
      )
      .where(whereRaw)
      .orderBy("bucket", "DESC")
      .limit(limit + 1);

    const rows = (await query) as Array<Record<string, unknown>>;
    const hasMoreRows = rows.length > limit;
    const truncated = hasMoreRows ? rows.slice(0, limit) : rows;

    let nextCursor: string | undefined;
    if (hasMoreRows && truncated.length > 0) {
      const lastRow = truncated[truncated.length - 1]!;
      const bucketValue = lastRow["bucket"] as string | Date | null | undefined;
      nextCursor = Buffer.from(dbToIso(bucketValue) ?? String(bucketValue)).toString("base64");
    }

    return formatOutputDataQueryRows(
      truncated,
      [...(request.aggregates ?? DEFAULT_AGGREGATES)],
      nextCursor,
    );
  }

  protected async querySensorDataRawAsync(
    request: SensorDataQueryRequest,
    interval: string,
  ): Promise<SensorDataQueryResponse> {
    const limit = Math.min(request.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const whereRaw = this.buildRawFilters(request, "sensor_id", request.readingTypes);
    const query = buildSensorRawQuery(this.connection, interval, whereRaw, limit);

    const rows = (await query) as Array<Record<string, unknown>>;
    const hasMoreRows = rows.length > limit;
    const truncated = hasMoreRows ? rows.slice(0, limit) : rows;

    let nextCursor: string | undefined;
    if (hasMoreRows && truncated.length > 0) {
      const lastRow = truncated[truncated.length - 1]!;
      const bucketValue = lastRow["bucket"] as string | Date | null | undefined;
      nextCursor = Buffer.from(dbToIso(bucketValue) ?? String(bucketValue)).toString("base64");
    }

    return formatSensorDataQueryRows(
      truncated,
      [...(request.aggregates ?? DEFAULT_AGGREGATES)],
      nextCursor,
    );
  }

  protected async queryOutputDataRawAsync(
    request: OutputDataQueryRequest,
    interval: string,
  ): Promise<OutputDataQueryResponse> {
    const limit = Math.min(request.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const whereRaw = this.buildRawFilters(request, "output_id", undefined);
    const query = buildOutputRawQuery(this.connection, interval, whereRaw, limit);

    const rows = (await query) as Array<Record<string, unknown>>;
    const hasMoreRows = rows.length > limit;
    const truncated = hasMoreRows ? rows.slice(0, limit) : rows;

    let nextCursor: string | undefined;
    if (hasMoreRows && truncated.length > 0) {
      const lastRow = truncated[truncated.length - 1]!;
      const bucketValue = lastRow["bucket"] as string | Date | null | undefined;
      nextCursor = Buffer.from(dbToIso(bucketValue) ?? String(bucketValue)).toString("base64");
    }

    return formatOutputDataQueryRows(
      truncated,
      [...(request.aggregates ?? DEFAULT_AGGREGATES)],
      nextCursor,
    );
  }

  protected parseCursor(cursor: string | undefined): Date | undefined {
    if (!cursor) {
      return undefined;
    }

    try {
      const decoded = Buffer.from(cursor, "base64").toString();
      const date = new Date(decoded);
      if (isNaN(date.getTime())) {
        throw new InvalidCursorError(`Invalid cursor timestamp: ${decoded}`);
      }
      return date;
    } catch {
      throw new InvalidCursorError("Invalid cursor: must be base64-encoded ISO 8601 timestamp");
    }
  }

  protected async psqlWithParamsAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    sqlTemplate: string,
    params: Record<string, string>,
    logger: winston.Logger,
    targetDatabase?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const psqlInput =
        Object.entries(params)
          .map(([name, value]) => `\\set ${name} '${value}'`)
          .join("\n") +
        "\n" +
        sqlTemplate;

      const psql = spawn(
        "psql",
        [
          `--host=${host}`,
          `--port=${port}`,
          `--username=${user}`,
          targetDatabase ? `--dbname=${targetDatabase}` : "--dbname=postgres",
          "--set=ON_ERROR_STOP=on",
          "--no-psqlrc",
          "-f",
          "-",
        ],
        {
          env: this.buildPostgresToolEnv(password),
        },
      );

      const stderrChunks: string[] = [];
      psql.stderr.on("data", (d) => {
        const chunk = d.toString();
        stderrChunks.push(chunk);
        logger.debug("psql:", chunk);
      });

      psql.on("error", (err) => reject(err));

      psql.stdin.write(psqlInput);
      psql.stdin.end();

      psql.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(this.buildRestoreErrorMessage(code, stderrChunks.join(""), "psql")));
        } else {
          resolve();
        }
      });
    });
  }

  protected async backupDatabaseArchiveAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    outputFile: string,
    logger: winston.Logger,
  ): Promise<void> {
    const tempOutputFile = `${outputFile}.partial`;

    await fs.promises.rm(tempOutputFile, { force: true });

    try {
      await new Promise<void>((resolve, reject) => {
        const stderrChunks: string[] = [];
        const dump = spawn(
          "pg_dump",
          [
            `--host=${host}`,
            `--port=${port}`,
            `--username=${user}`,
            "--format=custom",
            "--compress=9",
            "--no-owner",
            "--no-privileges",
            `--file=${tempOutputFile}`,
            this.connection.client.database(),
          ],
          {
            env: this.buildPostgresToolEnv(password),
          },
        );

        dump.stderr.on("data", (d) => {
          const chunk = d.toString();
          stderrChunks.push(chunk);
          logger.debug("pg_dump:", chunk);
        });

        dump.on("error", (err) => reject(err));
        dump.on("close", (code) => {
          if (code !== 0) {
            reject(
              new Error(this.buildRestoreErrorMessage(code, stderrChunks.join(""), "pg_dump")),
            );
            return;
          }

          resolve();
        });
      });

      const archiveStats = await fs.promises.stat(tempOutputFile);
      if (!archiveStats.isFile() || archiveStats.size === 0) {
        throw new Error("pg_dump produced an empty backup archive");
      }

      await this.validateBackupArchiveAsync(tempOutputFile, logger);
      await fs.promises.rename(tempOutputFile, outputFile);
    } catch (error) {
      await fs.promises.rm(tempOutputFile, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  protected async restoreDatabaseArchiveAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    inputFile: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    await this.validateBackupArchiveAsync(inputFile, logger);

    await this.runTimescaleHookAsync(
      host,
      port,
      user,
      password,
      databaseName,
      "timescaledb_pre_restore",
      logger,
    );
    await this.restoreViaPgRestoreAsync(
      host,
      port,
      user,
      password,
      inputFile,
      databaseName,
      logger,
    );
    await this.runTimescaleHookAsync(
      host,
      port,
      user,
      password,
      databaseName,
      "timescaledb_post_restore",
      logger,
    );
  }

  protected async runTimescaleHookAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    databaseName: string,
    functionName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `SELECT :"functionName"();`,
      { functionName },
      logger,
      databaseName,
    );
  }

  protected async restoreViaPgRestoreAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    archiveFile: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const pgRestore = spawn(
        "pg_restore",
        [
          `--host=${host}`,
          `--port=${port}`,
          `--username=${user}`,
          `--dbname=${databaseName}`,
          "--clean",
          "--if-exists",
          "--no-owner",
          "--no-privileges",
          "--single-transaction",
          "--exit-on-error",
          archiveFile,
        ],
        {
          env: this.buildPostgresToolEnv(password),
        },
      );

      const stderrChunks: string[] = [];
      pgRestore.stderr.on("data", (d) => {
        const chunk = d.toString();
        stderrChunks.push(chunk);
        logger.debug("pg_restore:", chunk);
      });

      pgRestore.on("error", (err) => reject(err));

      pgRestore.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(this.buildRestoreErrorMessage(code, stderrChunks.join(""), "pg_restore")),
          );
        } else {
          resolve();
        }
      });
    });
  }

  protected async validateBackupArchiveAsync(
    archiveFile: string,
    logger: winston.Logger,
  ): Promise<void> {
    let archiveStats: fs.Stats;

    try {
      archiveStats = await fs.promises.stat(archiveFile);
    } catch (error) {
      throw new Error(`Backup archive is not readable: ${(error as Error).message}`);
    }

    if (!archiveStats.isFile()) {
      throw new Error("Backup archive path is not a file");
    }

    if (archiveStats.size === 0) {
      throw new Error("Backup archive is empty");
    }

    await new Promise<void>((resolve, reject) => {
      const stderrChunks: string[] = [];
      const pgRestore = spawn("pg_restore", ["--list", archiveFile], {
        env: this.buildPostgresToolEnv(),
        stdio: ["ignore", "ignore", "pipe"],
      });

      pgRestore.stderr.on("data", (d) => {
        const chunk = d.toString();
        stderrChunks.push(chunk);
        logger.debug("pg_restore validate:", chunk);
      });

      pgRestore.on("error", (err) => reject(err));
      pgRestore.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(this.buildRestoreErrorMessage(code, stderrChunks.join(""), "pg_restore")),
          );
          return;
        }

        resolve();
      });
    });
  }

  protected buildPostgresToolEnv(password?: string): NodeJS.ProcessEnv {
    return {
      ...process.env,
      ...(password ? { PGPASSWORD: password } : {}),
      LANG: process.env["LANG"] ?? "C.UTF-8",
      LC_ALL: process.env["LC_ALL"] ?? "C.UTF-8",
      LANGUAGE: process.env["LANGUAGE"] ?? "C.UTF-8",
    };
  }

  protected buildRestoreErrorMessage(
    exitCode: number | null,
    stderrOutput: string,
    toolName: "pg_dump" | "pg_restore" | "psql",
  ): string {
    const normalizedStderr = stderrOutput.trim();
    if (normalizedStderr.includes("server version mismatch")) {
      return [
        `${toolName} exited with ${exitCode ?? "unknown"}.`,
        "PostgreSQL backup/restore requires client tools that match the server major version.",
        "Install a PostgreSQL 18 client or run backups from an environment that provides a matching binary.",
        normalizedStderr,
      ].join(" ");
    }

    if (normalizedStderr.length > 0) {
      return `${toolName} exited with ${exitCode ?? "unknown"}: ${normalizedStderr}`;
    }

    return `${toolName} exited with ${exitCode ?? "unknown"}`;
  }

  protected async dropDatabaseIfExistsAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `DROP DATABASE IF EXISTS :"databaseName";`,
      { databaseName },
      logger,
    );
  }

  protected async terminateOtherConnectionsAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :'databaseName' AND pid <> pg_backend_pid();`,
      { databaseName },
      logger,
    );
  }

  protected async renameDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    fromName: string,
    toName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `ALTER DATABASE :"fromName" RENAME TO :"toName";`,
      { fromName, toName },
      logger,
    );
  }

  protected async createDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `CREATE DATABASE :"databaseName";`,
      { databaseName },
      logger,
    );
  }
}

export class InvalidCursorError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function getAggregateSensorTableName(interval: string | undefined): string | undefined {
  return SENSOR_AGGREGATE_TABLES[interval ?? "5m"];
}

export function getAggregateOutputTableName(interval: string | undefined): string | undefined {
  return OUTPUT_AGGREGATE_TABLES[interval ?? "5m"];
}
