import { Request, Response } from "express";
import { FirmwareManager } from "../../../../esp32/FirmwareManager";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";

export async function getESP32ManifestAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  try {
    const manifest = await FirmwareManager.ESP32.getESP32ManifestAsync();
    response = {
      statusCode: 200,
      content: {
        data: manifest,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (e) {
    response = {
      statusCode: 500,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to retrieve ESP32 manifest: ${(e as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

export async function getESP32FirmwareBinaryAsync(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const data = await FirmwareManager.ESP32.getESP32FirmwareBinaryAsync();
    response.status(200);
    response.setHeader("Content-Type", "application/octet-stream");
    response.setHeader("Content-Disposition", "attachment; filename=firmware.bin");
    response.setHeader("Content-Length", data.size.toString());

    // Handle potential errors
    data.stream.on("error", (e) => {
      if (!response.headersSent) {
        response.status(500).json({
          statusCode: 500,
          error: {
            name: "Internal Server Error",
            url: request.originalUrl,
            details: [`Failed to retrieve ESP32: ${(e as Error).message}`],
          },
          ...response.locals["defaultProperties"],
        });
      } else {
        response.destroy();
      }
    });

    response.once("close", () => {
      data.stream.destroy();
    });

    data.stream.pipe(response);
  } catch (e) {
    response.status(500).json({
      statusCode: 500,
      error: {
        name: "Internal Server Error",
        url: request.originalUrl,
        details: [`Failed to retrieve ESP32: ${(e as Error).message}`],
      },
      ...response.locals["defaultProperties"],
    });
  }
}
