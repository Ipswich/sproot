import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { MdnsService } from "../../../system/MdnsService";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { randomBytes } from "crypto";
import { SDBExternalDevice } from "@sproot/database/SDBExternalDevice";

export async function getExternalDevicesHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const mdnsService = request.app.get("bonjourService") as MdnsService;

  try {
    const recognizedDevices = await sprootDB.getExternalDevicesAsync();

    const returnData = {
      recognized: recognizedDevices,
      unrecognized: mdnsService.devices.filter((service) => {
        return !recognizedDevices.some((device) => device.name === service.name);
      }),
    };

    return {
      statusCode: 200,
      content: {
        data: returnData,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 500,
      content: {
        error: "Failed to retrieve external devices.",
        details: (error as Error).message,
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function postExternalDevicesHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const { name, address } = request.body;

  const errorStrings: string[] = [];
  if (!name || typeof name !== "string") {
    errorStrings.push("Invalid or missing 'name' field.");
  }
  if (!address || typeof address !== "string") {
    errorStrings.push("Invalid or missing 'address' field.");
  }

  if (errorStrings.length > 0) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: errorStrings,
      },
      ...response.locals["defaultProperties"],
    };
  }

  try {
    const newDevice = {
      name,
      address: address,
      type: "ESP32",
      secureToken: randomBytes(32).toString("hex"),
    } as SDBExternalDevice;
    await sprootDB.addExternalDeviceAsync(newDevice);

    return {
      statusCode: 201,
      content: {
        data: newDevice,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 500,
      content: {
        error: "Failed to add external device.",
        details: (error as Error).message,
      },
      ...response.locals["defaultProperties"],
    };
  }
}
