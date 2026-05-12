import { Request, Response } from "express";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import type { operations as DeviceZoneContractOperations } from "@sproot/sproot-common/dist/api/generated/device-zones/types";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type CreateDeviceZoneRequestBody =
  DeviceZoneContractOperations["createDeviceZone"]["requestBody"]["content"]["application/json"];
type UpdateDeviceZonePathParams =
  DeviceZoneContractOperations["updateDeviceZone"]["parameters"]["path"];
type UpdateDeviceZoneRequestBody =
  DeviceZoneContractOperations["updateDeviceZone"]["requestBody"]["content"]["application/json"];
type DeleteDeviceZonePathParams =
  DeviceZoneContractOperations["deleteDeviceZone"]["parameters"]["path"];

export async function getAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB: ISprootDB = req.app.get(DI_KEYS.SprootDB);
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
        name: "Service Unavailable",
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
  const sprootDB: ISprootDB = req.app.get(DI_KEYS.SprootDB);
  const deviceZoneData = (getValidatedContractRequestData<"createDeviceZone">(res).body ??
    req.body) as CreateDeviceZoneRequestBody;
  let response: SuccessResponse | ErrorResponse;
  try {
    if (deviceZoneData.name === "") {
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
    const deviceZoneName = deviceZoneData.name;
    const newDeviceZone = await sprootDB.addDeviceZoneAsync(deviceZoneName);
    response = {
      statusCode: 201,
      content: {
        data: {
          id: newDeviceZone,
          name: deviceZoneName,
        },
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
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
  const sprootDB: ISprootDB = req.app.get(DI_KEYS.SprootDB);
  const validatedRequest = getValidatedContractRequestData<"updateDeviceZone">(res);
  const pathParams = (validatedRequest.params ?? req.params) as UpdateDeviceZonePathParams;
  const deviceZoneData = (validatedRequest.body ?? req.body) as UpdateDeviceZoneRequestBody;
  let response: SuccessResponse | ErrorResponse;
  try {
    const { deviceZoneId } = pathParams;
    const deviceZoneIdAsInt = parseInt(deviceZoneId ?? "", 10);
    if (deviceZoneId == null || isNaN(deviceZoneIdAsInt)) {
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

    if (deviceZoneData.name === "") {
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

    const existingDeviceZone = (await sprootDB.getDeviceZonesAsync()).find(
      (dg) => dg.id === deviceZoneIdAsInt,
    );

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

    existingDeviceZone.name = deviceZoneData.name ?? existingDeviceZone.name;
    await sprootDB.updateDeviceZoneAsync(existingDeviceZone);
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
        name: "Service Unavailable",
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
  const sprootDB: ISprootDB = req.app.get(DI_KEYS.SprootDB);
  const pathParams = (getValidatedContractRequestData<"deleteDeviceZone">(res).params ??
    req.params) as DeleteDeviceZonePathParams;
  let response: SuccessResponse | ErrorResponse;
  try {
    const { deviceZoneId } = pathParams;
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
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to delete device zone: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}
