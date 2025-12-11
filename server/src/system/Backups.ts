import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { BACKUP_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";
import {
  createTimeStampSuffix,
  sortDirectoryByStatsAsync,
} from "@sproot/sproot-common/dist/utility/Files";
import { createReadStream, promises as fsPromises } from "fs";
import winston from "winston";
import path from "node:path";
import { ReadStream } from "node:fs";

export class Backups {
  static isGeneratingBackup = false;

  static async createAsync(sprootDB: ISprootDB, logger: winston.Logger): Promise<void> {
    const backupFilePath = `${BACKUP_DIRECTORY}/sproot-backup-${createTimeStampSuffix(new Date())}.sproot.gz`;
    try {
      if (!this.isGeneratingBackup) {
        this.isGeneratingBackup = true;
        await sprootDB.backupDatabaseAsync(
          process.env["DATABASE_HOST"]!,
          parseInt(process.env["DATABASE_PORT"]!),
          process.env["DATABASE_USER"]!,
          process.env["DATABASE_PASSWORD"]!,
          backupFilePath,
        );
      }
    } catch (error) {
      logger.error(`Failed to create backup: ${(error as Error).message}`);
    } finally {
      this.isGeneratingBackup = false;
    }
  }

  static async restoreAsync(
    backupPath: string,
    sprootDB: ISprootDB,
    logger: winston.Logger,
  ): Promise<boolean> {
    try {
      await sprootDB.restoreDatabaseAsync(
        process.env["DATABASE_HOST"]!,
        parseInt(process.env["DATABASE_PORT"]!),
        process.env["DATABASE_USER"]!,
        process.env["DATABASE_PASSWORD"]!,
        backupPath,
      );
      return true;
    } catch (error) {
      logger.error(`Failed to restore from backup: ${(error as Error).message}`);
      return false;
    }
  }

  static async getByFileNameAsync(
    fileName: string,
    logger: winston.Logger,
    directory: string = BACKUP_DIRECTORY,
  ): Promise<{ stream: ReadStream; size: number; name: string } | null> {
    const path = `${directory}/${fileName}.sproot.gz`;
    try {
      await fsPromises.access(path);
      return {
        stream: createReadStream(path),
        size: (await fsPromises.stat(path)).size,
        name: `${fileName}.sproot.gz`,
      };
    } catch (error) {
      logger.error(`Failed to get backup file ${fileName}: ${(error as Error).message}`);
      return null;
    }
  }

  static async getFileNamesAsync(directory: string = BACKUP_DIRECTORY): Promise<string[]> {
    try {
      const files = await sortDirectoryByStatsAsync(
        directory,
        (a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime(),
      );

      if (!files) {
        return [];
      }

      const suffix = ".sproot.gz";
      return files
        .filter((file) => file.endsWith(suffix))
        .map((f) => {
          const base = path.basename(f);
          return base.endsWith(suffix) ? base.slice(0, -suffix.length) : path.parse(base).name;
        });
    } catch (error) {
      return [];
    }
  }

  static async runRetentionPolicyAsync(
    logger: winston.Logger,
    retentionDirectory: string,
    retentionDays: string,
  ): Promise<void> {
    try {
      const files = await fsPromises.readdir(retentionDirectory);

      const retentionCount = parseInt(retentionDays || "30", 10);
      const now = new Date();

      for (const file of files) {
        const filePath = path.join(retentionDirectory, file);
        const stats = await fsPromises.stat(filePath);
        const ageInDays = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > retentionCount) {
          await fsPromises.unlink(filePath);
          logger.info(`Deleted old backup file: ${file}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to run backup retention policy: ${(error as Error).message}`);
    }
  }
}
