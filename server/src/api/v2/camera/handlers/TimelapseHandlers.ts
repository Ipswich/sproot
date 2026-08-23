import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { CameraManager } from "../../../../camera/CameraManager";

function getCameraId(request: Request): number | null {
  const rawCameraId = request.params["cameraId"];
  const cameraId = Array.isArray(rawCameraId) ? rawCameraId[0] : rawCameraId;
  const parsed = Number.parseInt(cameraId ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export async function getTimelapseArchiveAsync(
  request: Request,
  response: Response,
): Promise<void> {
  const cameraId = getCameraId(request);
  if (cameraId === null) {
    response.status(400).json({
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["cameraId must be a positive integer"],
      },
      ...response.locals["defaultProperties"],
    });
    return;
  }

  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
  const timelapseArchive = await cameraManager.getTimelapseArchiveAsync(cameraId);

  if (timelapseArchive === null) {
    response.status(404).json({
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`No timelapse archive available`],
      },
      ...response.locals["defaultProperties"],
    });
    return;
  }
  response.status(200);
  response.setHeader("Content-Type", "application/x-tar");
  response.setHeader("Content-Disposition", "attachment; filename=timelapse.tar");

  timelapseArchive.on("error", () => {
    if (!response.headersSent) {
      response.status(500).json({
        statusCode: 500,
        error: {
          name: "Internal Server Error",
          url: request.originalUrl,
          details: ["Error streaming timelapse archive"],
        },
        ...response.locals["defaultProperties"],
      });
    } else {
      response.destroy();
    }
  });

  response.once("close", () => {
    timelapseArchive.destroy();
  });

  timelapseArchive.pipe(response);
}

export function postRegenerateTimelapseArchive(request: Request, response: Response): void {
  const cameraId = getCameraId(request);
  if (cameraId === null) {
    response.status(400).json({
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["cameraId must be a positive integer"],
      },
      ...response.locals["defaultProperties"],
    });
    return;
  }

  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;

  cameraManager.regenerateTimelapseArchiveAsync(cameraId);
  response.status(202).json({
    statusCode: 202,
    content: {
      data: "Timelapse archive regeneration queued.",
    },
    ...response.locals["defaultProperties"],
  });
}

export function getTimelapseGenerationStatus(request: Request, response: Response): void {
  const cameraId = getCameraId(request);
  if (cameraId === null) {
    response.status(400).json({
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["cameraId must be a positive integer"],
      },
      ...response.locals["defaultProperties"],
    });
    return;
  }

  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
  const status = cameraManager.getTimelapseArchiveProgress(cameraId);
  response.status(200).json({
    statusCode: 200,
    content: {
      data: status,
    },
    ...response.locals["defaultProperties"],
  });
}
