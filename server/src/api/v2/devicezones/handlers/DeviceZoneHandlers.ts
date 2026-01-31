import { SDBDeviceZone } from "@sproot/sproot-common/dist/database/SDBDeviceZone";
import { Request, Response } from "express";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/dist/api/v2/Responses";

export async function getAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB: ISprootDB = req.app.get("sprootDB");
  let response: SuccessResponse | ErrorResponse;
  try {
    const results = await sprootDB.getDeviceZonesAsync();
    response = {
      statusCode: 200,
      content: {
        data: results,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to retrieve device zones: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

export async function addAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB: ISprootDB = req.app.get("sprootDB");
  let response: SuccessResponse | ErrorResponse;
  try {
    const deviceZoneData: Partial<SDBDeviceZone> = req.body;
    if (deviceZoneData.name == null || deviceZoneData.name === "") {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Device zone name is required."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }
    const newDeviceZone = await sprootDB.addDeviceZoneAsync(deviceZoneData.name);
    response = {
      statusCode: 201,
      content: {
        data: {
          id: newDeviceZone,
          name: deviceZoneData.name,
        },
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to add device zone: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

export async function updateAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB: ISprootDB = req.app.get("sprootDB");
  let response: SuccessResponse | ErrorResponse;
  try {
    const { deviceZoneId } = req.params;
    const deviceZoneData: Partial<SDBDeviceZone> = req.body;
    const errorMessages: string[] = [];

    if (deviceZoneData.name == null || deviceZoneData.name === "") {
      errorMessages.push("Device zone name is required.");
    }

    let existingDeviceZone: SDBDeviceZone | undefined;
    const deviceZoneIdAsInt = parseInt(deviceZoneId ?? "", 10);
    if (deviceZoneId == null || isNaN(deviceZoneIdAsInt)) {
      errorMessages.push("Valid device zone ID is required.");
    } else {
      existingDeviceZone = (await sprootDB.getDeviceZonesAsync()).find(
        (dg) => dg.id === deviceZoneIdAsInt,
      );
    }
    if (existingDeviceZone == null) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Device zone with ID ${deviceZoneId} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    if (errorMessages.length > 0) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: errorMessages,
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    // Null checked above
    existingDeviceZone!.name = deviceZoneData.name ?? existingDeviceZone!.name;
    await sprootDB.updateDeviceZoneAsync(existingDeviceZone!);
    response = {
      statusCode: 200,
      content: {
        data: existingDeviceZone,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to update device zone: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

export async function deleteAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB: ISprootDB = req.app.get("sprootDB");
  let response: SuccessResponse | ErrorResponse;
  try {
    const { deviceZoneId } = req.params;
    if (deviceZoneId == null || isNaN(parseInt(deviceZoneId, 10))) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Valid device zone ID is required."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }
    const id = parseInt(deviceZoneId, 10);
    await sprootDB.deleteDeviceZoneAsync(id);
    response = {
      statusCode: 200,
      content: {
        data: `Device zone with ID ${id} successfully deleted.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to delete device zone: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}
