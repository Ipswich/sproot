import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { CameraManager } from "../../../../camera/CameraManager";
import winston from "winston";

/**
 * Possible statusCodes: 200, 502
 * Streams MJPEG from the camera to the client.
 * @param request
 * @param response
 */
export async function streamHandlerAsync(request: Request, response: Response): Promise<void> {
  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;

  // Get the frame buffer for direct streaming
  const frameBuffer = cameraManager.getFrameBuffer();

  logger.info(`StreamHandler: frameBuffer available: ${!!frameBuffer}`);

  if (!frameBuffer) {
    logger.error("StreamHandler: frame buffer not available");
    if (!response.headersSent) {
      response.status(502).json({
        statusCode: 502,
        error: {
          name: "Bad Gateway",
          url: request.originalUrl,
          details: [`Camera stream not available`],
        },
        ...response.locals["defaultProperties"],
      });
    }
    return;
  }

  try {
    response.setHeader("Age", "0");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=FRAME");
    // Don't set Content-Length for streaming responses
    response.removeHeader("Content-Length");

    const clientId = `client_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const frameBufferStream = frameBuffer.getStream();
    let disconnected = false;

    const onClientDisconnect = () => {
      if (disconnected) {
        return;
      }

      disconnected = true;
      response.off("close", onClientDisconnect);
      response.off("finish", onClientDisconnect);
      response.off("error", onClientDisconnect);
      frameBufferStream.off("error", onFrameBufferError);
      frameBuffer.removeSubscriber(response);

      if (!response.writableEnded && response.writable) {
        response.end();
      }
    };

    const onFrameBufferError = (err: Error) => {
      logger.error(`StreamHandler: frame buffer stream error: ${err.message}`);
      onClientDisconnect();
    };

    // Create a subscriber for this client that writes chunks directly
    const subscriber: { onChunk: (chunk: Buffer) => void; onDestroy: () => void } = {
      onChunk: (chunk: Buffer) => {
        try {
          response.write(chunk);
        } catch (e) {
          logger.error(`StreamHandler: failed to write chunk to client ${clientId}: ${e}`);
          onClientDisconnect();
        }
      },
      onDestroy: () => {
        logger.debug(`StreamHandler: client ${clientId} destroyed`);
      },
    };

    // Add subscriber to frame buffer
    frameBuffer.addSubscriber(response, subscriber);

    response.once("close", onClientDisconnect);
    response.once("finish", onClientDisconnect);
    response.once("error", onClientDisconnect);

    // Handle errors on the pass-through stream
    frameBufferStream.on("error", onFrameBufferError);
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

/**
 * Possible statusCodes: 200, 409, 500
 * @param request
 * @param response
 */
export async function clearAllImagesHandlerAsync(
  request: Request,
  response: Response,
): Promise<void> {
  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;
  try {
    const result = await cameraManager.clearAllImagesAsync();
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

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 */
export async function getLatestImageAsync(request: Request, response: Response): Promise<void> {
  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
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
  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;
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
