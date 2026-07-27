import * as winston from "winston";

export interface ISystemRepository {
  getDatabaseSizeAsync(): Promise<number>;
  backupDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    outputFile: string,
    logger: winston.Logger,
  ): Promise<void>;

  validateBackupArchiveAsync(inputFile: string, logger: winston.Logger): Promise<void>;

  swapRestoreDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    inputFile: string,
    logger: winston.Logger,
  ): Promise<void>;

  deleteOldDatabaseAsync(logger: winston.Logger): Promise<void>;

  refreshAllAggregateTablesAsync(logger: winston.Logger): Promise<void>;
}
