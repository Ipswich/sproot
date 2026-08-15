import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { CameraManager } from "../../../../camera/CameraManager";
import winston from "winston";
import { Readable } from "stream";

function getCameraId(request: Request): number | null {
  const parsed = Number.parseInt(request.params["cameraId"] ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export async function streamHandlerAsync(request: Request, response: Response): Promise<void> {
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
  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;
  const upstreamResponse = await cameraManager.fetchStreamAsync(cameraId);

  if (!upstreamResponse || !upstreamResponse.ok || !upstreamResponse.body) {
    logger.error(`StreamHandler: upstream stream not available for camera ${cameraId}`);
    response.status(502).json({
      statusCode: 502,
      error: {
        name: "Bad Gateway",
        url: request.originalUrl,
        details: [`Camera stream not available for camera ${cameraId}`],
      },
      ...response.locals["defaultProperties"],
    });
    return;
  }

  try {
    response.status(upstreamResponse.status);

    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) {
      response.setHeader("Content-Type", contentType);
    }

    const cacheControl = upstreamResponse.headers.get("cache-control");
    if (cacheControl) {
      response.setHeader("Cache-Control", cacheControl);
    }

    const pragma = upstreamResponse.headers.get("pragma");
    if (pragma) {
      response.setHeader("Pragma", pragma);
    }

    const upstreamStream = Readable.fromWeb(upstreamResponse.body);
    upstreamStream.on("error", (error) => {
      logger.error(`StreamHandler: upstream stream error for camera ${cameraId}: ${error}`);
      response.destroy(error instanceof Error ? error : undefined);
    });

    response.once("close", () => {
      upstreamStream.destroy();
      void upstreamResponse.body?.cancel();
    });

    upstreamStream.pipe(response);
  } catch (e) {
    logger.error(`StreamHandler: error handling stream: ${e}`);
    if (!response.headersSent) {
      response.status(502).json({
        statusCode: 502,
        error: {
          name: "Bad Gateway",
          url: request.originalUrl,
          details: [`Could not connect to camera stream`],
        },
        ...response.locals["defaultProperties"],
      });
    }
  }
}

export async function clearAllImagesHandlerAsync(
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
  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;
  try {
    const result = await cameraManager.clearAllImagesAsync(cameraId);
    if (result) {
      response.status(200).json({
        statusCode: 200,
        content: {
          data: "All images cleared successfully",
        },
        ...response.locals["defaultProperties"],
      });
    } else {
      response.status(409).json({
        statusCode: 409,
        error: {
          name: "Conflict",
          url: request.originalUrl,
          details: [`Could not clear images at this time. Please try again later.`],
        },
        ...response.locals["defaultProperties"],
      });
    }
  } catch (e) {
    logger.error(`Error clearing all images: ${e}`);
    response.status(500).json({
      statusCode: 500,
      error: {
        name: "Internal Server Error",
        url: request.originalUrl,
        details: [`Could not clear all images`],
      },
      ...response.locals["defaultProperties"],
    });
  }
}

export async function getLatestImageAsync(request: Request, response: Response): Promise<void> {
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
  const imageBuffer = await cameraManager.getLatestImageAsync(cameraId);
  if (imageBuffer === null) {
    response.status(404).json({
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`No latest image`],
      },
      ...response.locals["defaultProperties"],
    });
    return;
  }

  response.setHeader("Content-Type", "image/jpeg");
  response.status(200).send(imageBuffer);
}
