import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { CameraManager } from "../../../../camera/CameraManager";
import winston from "winston";
import { Readable } from "stream";

type CameraTestUrlQueryKey = "captureUrl" | "streamUrl" | "healthUrl";

function getCameraId(request: Request): number | null {
  const rawCameraId = request.params["cameraId"];
  const cameraId = Array.isArray(rawCameraId) ? rawCameraId[0] : rawCameraId;
  const parsed = Number.parseInt(cameraId ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function isTruthyQueryValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }

  return false;
}

function getFreshCaptureRequested(request: Request): boolean {
  const rawCaptureNew = request.query["captureNew"];
  const captureNew = Array.isArray(rawCaptureNew) ? rawCaptureNew[0] : rawCaptureNew;
  return isTruthyQueryValue(captureNew);
}

function getTestUrl(request: Request, key: CameraTestUrlQueryKey): string | null {
  const rawValue = request.query[key];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return value.trim();
  } catch {
    return null;
  }
}

function sendBadRequest(request: Request, response: Response, details: string[]): void {
  response.status(400).json({
    statusCode: 400,
    error: {
      name: "Bad Request",
      url: request.originalUrl,
      details,
    },
    ...response.locals["defaultProperties"],
  });
}

function sendBadGateway(request: Request, response: Response, details: string[]): void {
  response.status(502).json({
    statusCode: 502,
    error: {
      name: "Bad Gateway",
      url: request.originalUrl,
      details,
    },
    ...response.locals["defaultProperties"],
  });
}

async function fetchUpstreamAsync(
  url: string,
  logger: winston.Logger,
  logContext: string,
): Promise<globalThis.Response | null> {
  try {
    return await fetch(url, { method: "GET" });
  } catch (error) {
    logger.error(`${logContext}: failed to fetch upstream resource ${url}: ${error}`);
    return null;
  }
}

function pipeUpstreamResponse(
  upstreamResponse: globalThis.Response,
  response: Response,
  logger: winston.Logger,
  logContext: string,
): void {
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

  const upstreamStream = Readable.fromWeb(upstreamResponse.body!);
  upstreamStream.on("error", (error) => {
    logger.error(`${logContext}: upstream stream error: ${error}`);
    response.destroy(error instanceof Error ? error : undefined);
  });

  response.once("close", () => {
    upstreamStream.destroy();

    try {
      const cancelPromise = upstreamResponse.body?.cancel();
      void cancelPromise?.catch((error) => {
        logger.debug(`${logContext}: upstream cancel ignored: ${error}`);
      });
    } catch (error) {
      logger.debug(`${logContext}: upstream cancel ignored: ${error}`);
    }
  });

  upstreamStream.pipe(response);
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
  let upstreamResponse: globalThis.Response | null;

  try {
    upstreamResponse = await cameraManager.fetchStreamAsync(cameraId);
  } catch (error) {
    logger.error(`StreamHandler: failed to fetch upstream stream for camera ${cameraId}: ${error}`);
    sendBadGateway(request, response, [`Camera stream not available for camera ${cameraId}`]);
    return;
  }

  if (!upstreamResponse || !upstreamResponse.ok || !upstreamResponse.body) {
    logger.error(`StreamHandler: upstream stream not available for camera ${cameraId}`);
    sendBadGateway(request, response, [`Camera stream not available for camera ${cameraId}`]);
    return;
  }

  try {
    pipeUpstreamResponse(upstreamResponse, response, logger, `StreamHandler camera ${cameraId}`);
  } catch (e) {
    logger.error(`StreamHandler: error handling stream: ${e}`);
    if (!response.headersSent) {
      sendBadGateway(request, response, [`Could not connect to camera stream`]);
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
  const imageBuffer = getFreshCaptureRequested(request)
    ? await cameraManager.captureLatestImageAsync(cameraId)
    : await cameraManager.getLatestImageAsync(cameraId);
  if (imageBuffer === null) {
    if (getFreshCaptureRequested(request)) {
      sendBadGateway(request, response, [`Could not capture a fresh image for camera ${cameraId}`]);
      return;
    }

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

export async function testLatestImageHandlerAsync(
  request: Request,
  response: Response,
): Promise<void> {
  const captureUrl = getTestUrl(request, "captureUrl");
  if (captureUrl === null) {
    sendBadRequest(request, response, ["captureUrl must be a valid http or https URL"]);
    return;
  }

  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;
  const upstreamResponse = await fetchUpstreamAsync(captureUrl, logger, "CameraLatestImageTest");

  if (!upstreamResponse || !upstreamResponse.ok || !upstreamResponse.body) {
    sendBadGateway(request, response, ["Camera latest image test failed"]);
    return;
  }

  const contentType = upstreamResponse.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("image/")) {
    sendBadGateway(request, response, ["Camera latest image test did not return an image"]);
    return;
  }

  const imageBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
  response.setHeader("Content-Type", upstreamResponse.headers.get("content-type") ?? "image/jpeg");
  response.status(200).send(imageBuffer);
}

export async function testStreamHandlerAsync(request: Request, response: Response): Promise<void> {
  const streamUrl = getTestUrl(request, "streamUrl");
  if (streamUrl === null) {
    sendBadRequest(request, response, ["streamUrl must be a valid http or https URL"]);
    return;
  }

  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;
  const upstreamResponse = await fetchUpstreamAsync(streamUrl, logger, "CameraStreamTest");
  if (!upstreamResponse || !upstreamResponse.ok || !upstreamResponse.body) {
    sendBadGateway(request, response, ["Camera stream test failed"]);
    return;
  }

  try {
    pipeUpstreamResponse(upstreamResponse, response, logger, "CameraStreamTest");
  } catch (error) {
    logger.error(`CameraStreamTest: error proxying test stream: ${error}`);
    if (!response.headersSent) {
      sendBadGateway(request, response, ["Could not proxy the camera test stream"]);
    }
  }
}

export async function testHealthHandlerAsync(request: Request, response: Response): Promise<void> {
  const healthUrl = getTestUrl(request, "healthUrl");
  if (healthUrl === null) {
    sendBadRequest(request, response, ["healthUrl must be a valid http or https URL"]);
    return;
  }

  const logger = request.app.get(DI_KEYS.Logger) as winston.Logger;
  const upstreamResponse = await fetchUpstreamAsync(healthUrl, logger, "CameraHealthTest");
  if (!upstreamResponse) {
    sendBadGateway(request, response, ["Camera health test failed"]);
    return;
  }

  const responseText = await upstreamResponse.text();
  const trimmedPreview = responseText.slice(0, 500);

  if (!upstreamResponse.ok) {
    response.status(502).json({
      statusCode: 502,
      error: {
        name: "Bad Gateway",
        url: request.originalUrl,
        details: [
          `Camera health test returned status ${upstreamResponse.status}`,
          ...(trimmedPreview ? [trimmedPreview] : []),
        ],
      },
      ...response.locals["defaultProperties"],
    });
    return;
  }

  response.status(200).json({
    statusCode: 200,
    content: {
      data: {
        ok: true,
        statusCode: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        contentType: upstreamResponse.headers.get("content-type"),
        bodyPreview: trimmedPreview,
      },
    },
    ...response.locals["defaultProperties"],
  });
}
