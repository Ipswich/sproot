import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { Models } from "@sproot/common/sensors/Models";
import { SensorList } from "../../../../sensors/list/SensorList";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";

export async function getAvailableDevices(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sensorList = request.app.get(DI_KEYS.SensorList) as SensorList;

  if (request.params["model"] == undefined) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Model cannot be undefined."],
      },
      ...response.locals["defaultProperties"],
    };
  }

  if (!(Object.values(Models) as string[]).includes(request.params["model"]!)) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [
          `Model '${request.params["model"]}' not recognized, supported models are: ${Object.values(Models).join(", ")}`,
        ],
      },
      ...response.locals["defaultProperties"],
    };
  }

  try {
    const devices = await sensorList.getAvailableDevices(
      request.params["model"]!,
      request.query["address"] as string | undefined,
      request.query["filterUsed"] !== "false",
      request.query["subcontrollerId"] != null
        ? parseInt(request.query["subcontrollerId"] as string, 10)
        : undefined,
    );

    return {
      statusCode: 200,
      content: {
        data: devices,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [(error as Error).message],
      },
      ...response.locals["defaultProperties"],
    };
  }
}