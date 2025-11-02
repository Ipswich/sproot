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
      recognized: recognizedDevices.map((device) => {
        const { secureToken, ...deviceWithoutToken } = device;
        return deviceWithoutToken;
      }),
      unrecognized: mdnsService.devices.filter((service) => {
        return !recognizedDevices.some((device) => device.hostName === service.hostName);
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
  const { name, hostName } = request.body;

  const errorStrings: string[] = [];
  if (!name || typeof name !== "string") {
    errorStrings.push("Invalid or missing 'name' field.");
  }
  if (!hostName || typeof hostName !== "string") {
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
      hostName,
      type: "ESP32",
      secureToken: randomBytes(32).toString("hex"),
    } as SDBExternalDevice;
    const id = await sprootDB.addExternalDeviceAsync(newDevice);

    return {
      statusCode: 201,
      content: {
        data: { id, name: newDevice.name, hostName: newDevice.hostName },
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

export async function patchExternalDevicesHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const { deviceId } = request.params;
  const { name } = request.body;

  const errorStrings: string[] = [];
  const id = parseInt(deviceId ?? "", 10);
  if (isNaN(id)) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: "Invalid 'id' parameter.",
      },
      ...response.locals["defaultProperties"],
    };
  }

  try {
    if (name && typeof name !== "string") {
      errorStrings.push("Invalid 'name' field.");
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

    const deviceFromDBs = (await sprootDB.getExternalDevicesAsync()).filter(
      (device) => device.id === id,
    );
    if (deviceFromDBs.length === 0) {
      return {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`External device with id ${id} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    const updatedDevice = deviceFromDBs[0]!;
    updatedDevice.name = name ?? updatedDevice.name;

    await sprootDB.updateExternalDeviceAsync(updatedDevice);

    return {
      statusCode: 200,
      content: {
        data: updatedDevice,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 500,
      content: {
        error: "Failed to update external device.",
        details: (error as Error).message,
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function deleteExternalDevicesHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const { deviceId } = request.params;

  const id = parseInt(deviceId ?? "", 10);
  if (isNaN(id)) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid 'id' parameter."],
      },
      ...response.locals["defaultProperties"],
    };
  }

  try {
    const rowsDeleted = await sprootDB.deleteExternalDeviceAsync(id);
    if (rowsDeleted === 0) {
      return {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`External device with id ${id} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }

    return {
      statusCode: 200,
      content: {
        data: `External device with id ${id} deleted successfully.`,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 500,
      content: {
        error: "Failed to delete external device.",
        details: (error as Error).message,
      },
      ...response.locals["defaultProperties"],
    };
  }
}
