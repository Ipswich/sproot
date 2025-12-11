import { Request, Response } from "express";
import { CameraManager } from "../../../../camera/CameraManager";

/**
 * Possible statusCodes: 200, 404, 500
 * @param request
 * @param response
 * @returns
 */
export async function getTimelapseArchiveAsync(
  request: Request,
  response: Response,
): Promise<void> {
  const cameraManager = request.app.get("cameraManager") as CameraManager;
  const timelapseArchive = await cameraManager.getTimelapseArchiveAsync();
  const timelapseArchiveSize = await cameraManager.getTimelapseArchiveSizeAsync();

  if (timelapseArchive === null || timelapseArchiveSize === null) {
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
  response.setHeader("Content-Length", (timelapseArchiveSize * 1024 * 1024).toString());
  response.setHeader("Content-Disposition", "attachment; filename=timelapse.tar");

  // Handle potential errors
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

/**
 * Possible statusCodes: 202
 * @param request
 * @param response
 * @returns
 */
export function postRegenerateTimelapseArchive(request: Request, response: Response): void {
  const cameraManager = request.app.get("cameraManager") as CameraManager;

  cameraManager.regenerateTimelapseArchiveAsync();
  response.status(202).json({
    statusCode: 202,
    content: {
      data: "Timelapse archive regeneration queued.",
    },
    ...response.locals["defaultProperties"],
  });
}

/**
 * Possible statusCodes: 200
 * @param request
 * @param response
 * @returns
 */
export function getTimelapseGenerationStatus(request: Request, response: Response): void {
  const cameraManager = request.app.get("cameraManager") as CameraManager;
  const status = cameraManager.getTimelapseArchiveProgressAsync();
  response.status(200).json({
    statusCode: 200,
    content: {
      data: status,
    },
    ...response.locals["defaultProperties"],
  });
}
