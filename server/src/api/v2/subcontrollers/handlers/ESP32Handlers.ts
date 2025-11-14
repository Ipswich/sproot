import { Request, Response } from "express";
import { FirmwareManager } from "../../../../system/FirmwareManager";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { ISprootDB } from "@sproot/database/ISprootDB";
// import { MdnsService } from "../../../../system/MdnsService";
import { SDBSubcontroller } from "@sproot/database/SDBSubcontroller";

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

export async function updateESP32FirmwareOTAAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  // const mdnsService = request.app.get("mdnsService") as MdnsService;
  const { deviceId } = request.params;
  if (deviceId != undefined && isNaN(parseInt(deviceId, 10))) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid 'deviceId' parameter."],
      },
      ...response.locals["defaultProperties"],
    };
  }

  const id = parseInt(deviceId!, 10);

  let device: SDBSubcontroller | undefined;
  try {
    device = await sprootDB
      .getSubcontrollersAsync()
      .then((devices) => devices.find((d) => d.id === id));
  } catch (e) {
    return {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: ["Database connection failed."],
      },
      ...response.locals["defaultProperties"],
    };
  }

  if (!device) {
    return {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Subcontroller with id ${id} not found.`],
      },
      ...response.locals["defaultProperties"],
    };
  }
  if (device.type !== "ESP32") {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [`Subcontroller with id ${id} is not an ESP32.`],
      },
      ...response.locals["defaultProperties"],
    };
  }

  const ipAddress = "192.168.2.144"; // mdnsService.getIPAddressByHostName(device.hostName);
  if (!ipAddress) {
    return {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Could not resolve IP address for subcontroller with id ${id}.`],
      },
      ...response.locals["defaultProperties"],
    };
  }

  try {
    // await fetch(`http://${ipAddress}/api/system/update`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${device.secureToken}`,
    //   },
    //   body: JSON.stringify({
    //     host: request.get("host") || "",
    //   }),
    // });
    console.log(`Initiating firmware update for device ${id} at ${ipAddress}`);
    return {
      statusCode: 200,
      content: {
        data: { message: "Firmware update initiated successfully." },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (e) {
    return {
      statusCode: 500,
      error: {
        name: "Internal Server Error",
        url: request.originalUrl,
        details: [`Failed to initiate firmware update: ${(e as Error).message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}
