import { Request, Response } from "express";
import { CameraManager } from "../../../camera/CameraManager";

export async function streamHandlerAsync(request: Request, response: Response): Promise<void> {
  const cameraManger = request.app.get("cameraManager") as CameraManager;
  let abortController: AbortController | undefined;
  try {
    response.setHeader("Age", 0);
    response.setHeader("Cache-Control", "no-cache, private");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=FRAME");

    request.on("close", () => {
      abortController?.abort();
    });

    abortController = await cameraManger.forwardLivestreamAsync(response);
    abortController.signal.addEventListener("abort", () => {
      response.end();
    });
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

export async function getLatestImageAsync(request: Request, response: Response): Promise<void> {
  const cameraManger = request.app.get("cameraManager") as CameraManager;
  const imageBuffer = await cameraManger.getLatestImageAsync();
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
