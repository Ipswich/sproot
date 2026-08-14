import { ISystemRepository } from "../database/repositories/system/ISystemRepository";
import { BACKUP_DIRECTORY } from "@sproot/common/utility/Constants";
import { createTimeStampSuffix, sortDirectoryByStatsAsync } from "@sproot/common/utility/Files";
import { createReadStream, promises as fsPromises } from "fs";
import winston from "winston";
import path from "node:path";
import { ReadStream } from "node:fs";
import { validateDuration } from "../utils/DurationValidation";

export class Backups {
  static #generationStartTime: number | null = null;

  public static get isGeneratingBackup(): boolean {
    return this.#generationStartTime !== null;
  }

  static async createAsync(
    systemRepository: ISystemRepository,
    logger: winston.Logger,
  ): Promise<void> {
    try {
      if (!this.#generationStartTime) {
        const backupFilePath = `${BACKUP_DIRECTORY}/sproot-backup-${createTimeStampSuffix(new Date())}.sproot`;
        this.#generationStartTime = Date.now();
        logger.info(`Creating backup at ${backupFilePath}...`);
        await fsPromises.mkdir(BACKUP_DIRECTORY, { recursive: true });
        await systemRepository.backupDatabaseAsync(
          process.env["DATABASE_HOST"]!,
          parseInt(process.env["DATABASE_PORT"]!),
          process.env["DATABASE_USER"]!,
          process.env["DATABASE_PASSWORD"]!,
          backupFilePath,
          logger,
        );
        this.#generationStartTime = null;
      }
    } catch (error) {
      this.#generationStartTime = null;
      logger.error(`Failed to create backup: ${(error as Error).message}`);
      throw error;
    }
  }

  static async restoreAsync(
    backupPath: string,
    systemRepository: ISystemRepository,
    logger: winston.Logger,
  ): Promise<boolean> {
    try {
      await systemRepository.swapRestoreDatabaseAsync(
        process.env["DATABASE_HOST"]!,
        parseInt(process.env["DATABASE_PORT"]!),
        process.env["DATABASE_USER"]!,
        process.env["DATABASE_PASSWORD"]!,
        backupPath,
        logger,
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
    const path = `${directory}/${fileName}.sproot`;
    try {
      await fsPromises.access(path);
      return {
        stream: createReadStream(path),
        size: (await fsPromises.stat(path)).size,
        name: `${fileName}.sproot`,
      };
    } catch (error) {
      logger.error(`Failed to get backup file ${fileName}: ${(error as Error).message}`);
      return null;
    }
  }

  static async getCompletedFileNamesAsync(directory: string = BACKUP_DIRECTORY): Promise<string[]> {
    try {
      const files = await sortDirectoryByStatsAsync(
        directory,
        (a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime(),
        new Set<string>(),
      );

      if (!files) {
        return [];
      }

      const suffix = ".sproot";
      return files
        .filter(
          (file) =>
            file.name.endsWith(suffix) &&
            file.stats.mtimeMs < (this.#generationStartTime ?? Infinity),
        )
        .map((f) => {
          const base = path.basename(f.name);
          return base.endsWith(suffix) ? base.slice(0, -suffix.length) : path.parse(base).name;
        });
    } catch (error) {
      return [];
    }
  }

  static async runRetentionPolicyAsync(
    logger: winston.Logger,
    retentionDirectory: string,
    retentionDuration: string | null | undefined,
  ): Promise<void> {
    if (retentionDuration == null) {
      return;
    }

    const cutoff = resolveRetentionCutoff(retentionDuration, new Date());
    if (cutoff == null) {
      logger.warn(`Skipping backup retention policy due to invalid duration: ${retentionDuration}`);
      return;
    }

    try {
      const files = await fsPromises.readdir(retentionDirectory);

      for (const file of files) {
        const filePath = path.join(retentionDirectory, file);
        const stats = await fsPromises.stat(filePath);

        if (stats.mtime.getTime() < cutoff.getTime()) {
          await fsPromises.unlink(filePath);
          logger.info(`Deleted old backup file: ${file}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to run backup retention policy: ${(error as Error).message}`);
    }
  }
}

function resolveRetentionCutoff(duration: string, referenceDate: Date): Date | null {
  const validation = validateDuration(duration);
  if (!validation.valid) {
    return null;
  }

  const match = String(duration)
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s+([a-zA-Z]+)$/);
  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1]!, 10);
  const unit = match[2];
  const cutoff = new Date(referenceDate);

  switch (unit) {
    case "second":
    case "seconds":
      cutoff.setSeconds(cutoff.getSeconds() - amount);
      return cutoff;
    case "min":
    case "mins":
    case "minute":
    case "minutes":
      cutoff.setMinutes(cutoff.getMinutes() - amount);
      return cutoff;
    case "hour":
    case "hours":
      cutoff.setHours(cutoff.getHours() - amount);
      return cutoff;
    case "day":
    case "days":
      cutoff.setDate(cutoff.getDate() - amount);
      return cutoff;
    case "week":
    case "weeks":
      cutoff.setDate(cutoff.getDate() - amount * 7);
      return cutoff;
    case "month":
    case "months":
      cutoff.setMonth(cutoff.getMonth() - amount);
      return cutoff;
    case "year":
    case "years":
      cutoff.setFullYear(cutoff.getFullYear() - amount);
      return cutoff;
    default:
      return null;
  }
}
