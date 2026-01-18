import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { MdnsService } from "../../../../system/MdnsService";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { randomBytes } from "crypto";
import { SDBSubcontroller } from "@sproot/sproot-common/dist/database/SDBSubcontroller";
import { SensorList } from "../../../../sensors/list/SensorList";
import { OutputList } from "../../../../outputs/list/OutputList";

export async function getSubcontrollerHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const mdnsService = request.app.get("bonjourService") as MdnsService;

  try {
    const recognizedDevices = await sprootDB.getSubcontrollersAsync();

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
        error: "Failed to retrieve subcontrollers.",
        details: (error as Error).message,
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function getSubcontrollerOnlineAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const mdnsService = request.app.get("bonjourService") as MdnsService;
  const { deviceId } = request.params;

  let hostName: string | undefined;
  try {
    hostName = (await sprootDB.getSubcontrollersAsync()).find(
      (device) => device.id.toString() === deviceId,
    )?.hostName;
  } catch {
    return {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [`Database connection failed.`],
      },
      ...response.locals["defaultProperties"],
    };
  }

  if (!hostName) {
    return {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Subcontroller with id ${deviceId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };
  }
  try {
    const ipAddress = mdnsService.getIPAddressByHostName(hostName);
    if (ipAddress) {
      const fetchResponse = await fetch(`http://${ipAddress}/ping`, { method: "GET" });
      if (fetchResponse.ok) {
        const responseData = (await fetchResponse.json()) as { status: string; version: string };
        return {
          statusCode: 200,
          content: {
            data: { online: true, version: responseData.version },
          },
          ...response.locals["defaultProperties"],
        };
      }
    }
  } catch {}

  return {
    statusCode: 200,
    content: {
      data: { online: false },
    },
    ...response.locals["defaultProperties"],
  };
}

export async function postSubcontrollerHandlerAsync(
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
    } as SDBSubcontroller;
    const id = await sprootDB.addSubcontrollerAsync(newDevice);

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
        error: "Failed to add subcontroller.",
        details: (error as Error).message,
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function patchSubcontrollerHandlerAsync(
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

    const deviceFromDBs = (await sprootDB.getSubcontrollersAsync()).filter(
      (device) => device.id === id,
    );
    if (deviceFromDBs.length === 0) {
      return {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`subcontroller with id ${id} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    const updatedDevice = deviceFromDBs[0]!;
    updatedDevice.name = name ?? updatedDevice.name;

    await sprootDB.updateSubcontrollerAsync(updatedDevice);

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
        error: "Failed to update subcontroller.",
        details: (error as Error).message,
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function deleteSubcontrollerAsync(
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
    const rowsDeleted = await sprootDB.deleteSubcontrollersAsync(id);
    if (rowsDeleted === 0) {
      return {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`subcontroller with id ${id} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    const sensorList = request.app.get("sensorList") as SensorList;
    const outputList = request.app.get("sensorList") as OutputList;
    Promise.all([
      sensorList.regenerateAsync(),
      outputList.regenerateAsync(),
    ]);

    return {
      statusCode: 200,
      content: {
        data: `subcontroller with id ${id} deleted successfully.`,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 500,
      content: {
        error: "Failed to delete subcontroller.",
        details: (error as Error).message,
      },
      ...response.locals["defaultProperties"],
    };
  }
}
