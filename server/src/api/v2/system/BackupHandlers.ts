import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import winston from "winston";

import { Backups } from "../../../system/Backups";
import { ISystemRepository } from "../../../database/repositories/system/ISystemRepository";
import path from "path";
import fs from "fs";
import { tmpdir } from "os";
import { pipeline } from "stream/promises";
import { DI_KEYS } from "../../../utils/DependencyInjectionConstants";

export async function systemBackupListHandlerAsync(response: Response): Promise<SuccessResponse> {
  const backupFileNames = await Backups.getCompletedFileNamesAsync();
  return {
    statusCode: 200,
    content: {
      data: backupFileNames,
    },
    ...response.locals["defaultProperties"],
  };
}

export async function systemBackupDownloadHandlerAsync(
  request: Request,
  response: Response,
): Promise<void> {
  const fileName = request.params["fileName"];
  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;
  if (!fileName) {
    response.status(400).json({
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Backup file name is required"],
      },
      ...response.locals["defaultProperties"],
    });
    return;
  }

  const backupFileStreamData = await Backups.getByFileNameAsync(fileName, logger);
  if (!backupFileStreamData) {
    response.status(404).json({
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Backup file '${fileName}' not found`],
      },
      ...response.locals["defaultProperties"],
    });
    return;
  }

  response.status(200);
  response.setHeader("Content-Type", "application/octet-stream");
  response.setHeader("Content-Disposition", `attachment; filename=${backupFileStreamData.name}`);
  response.setHeader("Content-Length", backupFileStreamData.size.toString());
  backupFileStreamData.stream.pipe(response);
}

export async function systemBackupRestoreHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  // Generate a temp file path
  const tempDirectory = await fs.promises.mkdtemp(path.join(tmpdir(), "sproot-backup-"));
  const tempFile = `${tempDirectory}/uploaded-backup.sproot`;
  const writeStream = fs.createWriteStream(tempFile, { flags: "w" });
  const systemRepository = request.app.get(DI_KEYS.SprootDB).system as ISystemRepository;
  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;

  try {
    await pipeline(request, writeStream);
  } catch (err) {
    const uploadMsg = err instanceof Error ? err.message : String(err);
    await fs.promises.rm(tempDirectory, { recursive: true, force: true }).catch(() => undefined);
    return {
      statusCode: 500,
      error: {
        name: "Internal Server Error",
        url: request.originalUrl,
        details: [`Failed to upload backup file: ${uploadMsg}`],
      },
      ...response.locals["defaultProperties"],
    };
  }

  try {
    await systemRepository.validateBackupArchiveAsync(tempFile, logger);
  } catch (err) {
    await fs.promises.rm(tempDirectory, { recursive: true, force: true }).catch(() => undefined);
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [`Invalid backup file: ${(err as Error).message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }

  try {
    request.app.get("gracefulHaltAsync")(async (): Promise<void> => {
      logger.info(`Restoring from backup file ${tempFile}`);
      await Backups.restoreAsync(tempFile, systemRepository, logger);
      logger.info(`Restore complete! System exiting now!`);
    });

    return {
      statusCode: 202,
      content: { data: "Backup restore queued." },
      ...response.locals["defaultProperties"],
    };
  } catch (err) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [`Invalid backup file: ${(err as Error).message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function systemBackupCreateHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;
  try {
    Backups.createAsync(request.app.get(DI_KEYS.SprootDB).system as ISystemRepository, logger);
    return {
      statusCode: 202,
      content: {
        data: "Backup creation queued.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 500,
      error: {
        name: "Internal Server Error",
        url: request.originalUrl,
        details: [`Failed to create backup: ${(error as Error).message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function systemBackupCreateStatusHandlerAsync(
  response: Response,
): Promise<SuccessResponse> {
  return {
    statusCode: 200,
    content: {
      data: {
        isGeneratingBackup: Backups.isGeneratingBackup,
      },
    },
    ...response.locals["defaultProperties"],
  };
}
