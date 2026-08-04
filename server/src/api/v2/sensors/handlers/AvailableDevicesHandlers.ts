import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { SensorList } from "../../../../sensors/list/SensorList";
import { Models } from "@sproot/common/sensors/Models";

export async function getAvailableDevices(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sensorList = request.app.get(DI_KEYS.SensorList) as SensorList;
  let getAvailableDevicesResponse: SuccessResponse | ErrorResponse;

  const errorDetails: string[] = [];
  if (request.params["model"] == undefined) {
    errorDetails.push("Model cannot be undefined.");
  }
  if (errorDetails.length > 0) {
    getAvailableDevicesResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: errorDetails,
      },
      ...response.locals["defaultProperties"],
    };
    return getAvailableDevicesResponse;
  }

  try {
    const modelValue = request.params["model"]!;
    const modelValues = Object.values(Models) as string[];
    if (!modelValues.includes(modelValue)) {
      const supportedModels = Object.values(Models).join(", ");
      getAvailableDevicesResponse = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: request.originalUrl,
          details: [
            `Model '${modelValue}' not recognized. Supported models are: ${supportedModels}`,
          ],
        },
        ...response.locals["defaultProperties"],
      };
      return getAvailableDevicesResponse;
    }

    const filterUsedRaw = request.query["filterUsed"];
    const filterUsed = filterUsedRaw === "false" ? false : true;
    const devices = await sensorList.getAvailableDevices(modelValue, filterUsed);

    getAvailableDevicesResponse = {
      statusCode: 200,
      content: {
        data: devices,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (e) {
    getAvailableDevicesResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [`${e}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return getAvailableDevicesResponse;
}
