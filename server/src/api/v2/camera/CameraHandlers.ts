import { Request, Response } from "express";
import { CameraManager } from "../../../camera/CameraManager";
import { ErrorResponse } from "@sproot/api/v2/Responses";

export async function streamHandlerAsync(
  request: Request,
  response: Response,
): Promise<Response | ErrorResponse> {
  const cameraManger = request.app.get("cameraManager") as CameraManager;
  try {
    cameraManger.forwardLivestream(response);
    response.setHeader("Age", 0);
    response.setHeader("Cache-Control", "no-cache, private");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=FRAME");
    response.status(200);
    return response;
  } catch {
    return {
      statusCode: 502,
      error: {
        name: "Bad Gateway",
        url: request.originalUrl,
        details: [`Could not connect to camera server`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}
