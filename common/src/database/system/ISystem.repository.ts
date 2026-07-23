/* eslint-disable @typescript-eslint/no-unused-vars */
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

export class MockSystemRepository implements ISystemRepository {
  async getDatabaseSizeAsync(): Promise<number> {
    return 0;
  }
  async backupDatabaseAsync(
    _host: string,
    _port: number,
    _user: string,
    _password: string,
    _outputFile: string,
    _logger: winston.Logger,
  ): Promise<void> {
    return;
  }
  async validateBackupArchiveAsync(_inputFile: string, _logger: winston.Logger): Promise<void> {
    return;
  }
  async swapRestoreDatabaseAsync(
    _host: string,
    _port: number,
    _user: string,
    _password: string,
    _inputFile: string,
    _logger: winston.Logger,
  ): Promise<void> {
    return;
  }
  async deleteOldDatabaseAsync(_logger: winston.Logger): Promise<void> {
    return;
  }
  async refreshAllAggregateTablesAsync(_logger: winston.Logger): Promise<void> {
    return;
  }
}
