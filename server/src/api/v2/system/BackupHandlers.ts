import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import winston from "winston";

import { Backups } from "../../../system/Backups";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import path from "path";
import fs from "fs";
import { tmpdir } from "os";
import { finished } from "stream/promises";

export async function systemBackupListHandlerAsync(response: Response): Promise<SuccessResponse> {
  const backupFileNames = await Backups.getFileNamesAsync();
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
  const logger = request.app.get("logger") as winston.Logger;
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
  const tempFile =
    (await fs.promises.mkdtemp(path.join(tmpdir(), "sproot-backup-"))) +
    "/uploaded-backup.sproot.gz";
  const writeStream = fs.createWriteStream(tempFile, { flags: "w" });
  let uploadError: string | null = null;

  // Stream incoming request to temp file
  request.pipe(writeStream);

  request.on("error", (err) => (uploadError = err.toString()));
  writeStream.on("error", (err) => (uploadError = err.toString()));

  try {
    await finished(writeStream);
    if (uploadError) {
      throw new Error(uploadError);
    }
  } catch (err) {
    const uploadMsg = uploadError ?? (err instanceof Error ? err.message : String(err));
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
    // Check gzip header (first 2 bytes: 0x1f, 0x8b)
    const fd = fs.openSync(tempFile, "r");
    const buffer = new Uint8Array(2);
    fs.readSync(fd, buffer, 0, 2, 0);
    fs.closeSync(fd);
    if (buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
      throw new Error("Uploaded file is not valid gzip");
    }

    request.app.get("gracefulHaltAsync")(async (): Promise<void> => {
      request.app.get("logger").info(`Restoring from backup file ${tempFile}`);
      await Backups.restoreAsync(
        tempFile,
        request.app.get("sprootDB") as ISprootDB,
        request.app.get("logger") as winston.Logger,
      );
      request.app.get("logger").info(`Restore complete! System exiting now!`);
    });

    return {
      statusCode: 202,
      content: { data: "Backup restore queued." },
      ...response.locals["defaultProperties"],
    };
  } catch (err: any) {
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
  const logger = request.app.get("logger") as winston.Logger;
  try {
    Backups.createAsync(request.app.get("sprootDB") as ISprootDB, logger);
    return {
      statusCode: 202,
      content: {
        data: "Backup creation queued.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      error: {
        name: "Internal Server Error",
        url: request.originalUrl,
        details: [`Failed to create backup: ${error.message}`],
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
