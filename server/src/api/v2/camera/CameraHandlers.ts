import { Request, Response } from "express";
import { CameraManager } from "../../../camera/CameraManager";

export async function streamHandlerAsync(request: Request, response: Response): Promise<void> {
  const cameraManger = request.app.get("cameraManager") as CameraManager;
  try {
    const controller = new AbortController();
    request.on("close", () => {
      controller.abort();
    });
    await cameraManger.forwardLivestreamAsync(response);
    response.setHeader("Age", 0);
    response.setHeader("Cache-Control", "no-cache, private");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=FRAME");
    response.status(200);
  } catch (e) {
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
