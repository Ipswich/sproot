import { Request, Response } from "express";
import { CameraManager } from "../../../../camera/CameraManager";
import winston from "winston";
import { pipeline } from "stream";

/**
 * Possible statusCodes: 200, 502
 * @param request
 * @param response
 */
export async function streamHandlerAsync(request: Request, response: Response): Promise<void> {
  const cameraManager = request.app.get("cameraManager") as CameraManager;
  const logger = request.app.get("logger") as winston.Logger;
  try {
    response.setHeader("Age", 0);
    response.setHeader("Cache-Control", "no-cache, private");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=FRAME");

    const livestream = cameraManager.livestream;
    if (!livestream) {
      throw new Error("Livestream not available");
    }

    // Handle errors on the readable stream
    const onStreamError = (err: Error) => {
      logger.error(`Upstream error, HTTP response: ${err}`);
      response.end();
    };
    livestream.on("error", onStreamError);

    // Handle client disconnection
    response.on("close", () => {
      livestream.unpipe(response);
      livestream.removeListener("error", onStreamError);
    });

    pipeline(livestream, response, (err) => {
      if (err) {
        logger.error(`Pipeline error: ${err}`);
        response.end();
      }
    });
    // livestream.pipe(response);
    response.status(200);
  } catch (e) {
    if (!response.headersSent) {
      response.status(502).json({
        statusCode: 502,
        error: {
          name: "Bad Gateway",
          url: request.originalUrl,
          details: [`Could not connect to camera server`],
        },
        ...response.locals["defaultProperties"],
      });
    }
  }
}

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 */
export async function getLatestImageAsync(request: Request, response: Response): Promise<void> {
  const cameraManager = request.app.get("cameraManager") as CameraManager;
  const imageBuffer = await cameraManager.getLatestImageAsync();
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

/**
 * Possible statusCodes: 200, 502
 * @param request
 * @param response
 */
export async function reconnectLivestreamAsync(
  request: Request,
  response: Response,
): Promise<void> {
  const cameraManager = request.app.get("cameraManager") as CameraManager;
  const logger = request.app.get("logger") as winston.Logger;
  try {
    await cameraManager.reconnectLivestreamAsync();
    response.status(200).json({
      statusCode: 200,
      content: {
        data: "Livestream successfully reconnected",
      },
      ...response.locals["defaultProperties"],
    });
  } catch (e) {
    logger.error(`Error reconnecting livestream: ${e}`);
    response.status(502).json({
      statusCode: 502,
      error: {
        name: "Bad Gateway",
        url: request.originalUrl,
        details: [`Could not connect to camera server`],
      },
      ...response.locals["defaultProperties"],
    });
  }
}
