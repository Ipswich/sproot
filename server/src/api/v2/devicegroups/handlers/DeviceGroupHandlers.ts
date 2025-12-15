import { SDBDeviceGroup } from "@sproot/sproot-common/dist/database/SDBDeviceGroup";
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
    const results = await sprootDB.getDeviceGroupsAsync();
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
        details: [`Failed to retrieve device groups: ${(error as Error).message}`],
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
    const deviceGroupData: Partial<SDBDeviceGroup> = req.body;
    if (deviceGroupData.name == null || deviceGroupData.name === "") {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Device group name is required."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }
    const newDeviceGroup = await sprootDB.addDeviceGroupAsync(deviceGroupData.name);
    response = {
      statusCode: 201,
      content: {
        data: {
          id: newDeviceGroup,
          name: deviceGroupData.name,
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
        details: [`Failed to add device group: ${(error as Error).message}`],
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
    const { deviceGroupId } = req.params;
    const deviceGroupData: Partial<SDBDeviceGroup> = req.body;
    const errorMessages: string[] = [];

    if (deviceGroupData.name == null || deviceGroupData.name === "") {
      errorMessages.push("Device group name is required.");
    }

    let existingDeviceGroup: SDBDeviceGroup | undefined;
    const deviceGroupIdAsInt = parseInt(deviceGroupId ?? "", 10);
    if (deviceGroupId == null || isNaN(deviceGroupIdAsInt)) {
      errorMessages.push("Valid device group ID is required.");
    } else {
      existingDeviceGroup = (await sprootDB.getDeviceGroupsAsync()).find(
        (dg) => dg.id === deviceGroupIdAsInt,
      );
    }
    if (existingDeviceGroup == null) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Device group with ID ${deviceGroupId} not found.`],
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
    existingDeviceGroup!.name = deviceGroupData.name ?? existingDeviceGroup!.name;
    await sprootDB.updateDeviceGroupAsync(existingDeviceGroup!);
    response = {
      statusCode: 200,
      content: {
        data: existingDeviceGroup,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to update device group: ${(error as Error).message}`],
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
    const { deviceGroupId } = req.params;
    if (deviceGroupId == null || isNaN(parseInt(deviceGroupId, 10))) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Valid device group ID is required."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }
    const id = parseInt(deviceGroupId, 10);
    await sprootDB.deleteDeviceGroupAsync(id);
    response = {
      statusCode: 200,
      content: {
        data: `Device group with ID ${id} successfully deleted.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to delete device group: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}
