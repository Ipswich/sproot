import { SensorList } from "../../../../sensors/list/SensorList";
import { ISprootDB } from "@sproot/database/ISprootDB";
import { SDBSensor } from "@sproot/database/SDBSensor";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 * @returns
 */
export function getSensorDataHandler(
  request: Request,
  response: Response,
): SuccessResponse | ErrorResponse {
  const sensorList = request.app.get("sensorList") as SensorList;
  let sensorDataResponse: SuccessResponse | ErrorResponse;

  if (request.params["id"] !== undefined) {
    if (sensorList.sensorData[request.params["id"]]) {
      sensorDataResponse = {
        statusCode: 200,
        content: {
          data: [sensorList.sensorData[request.params["id"]]],
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      sensorDataResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Sensor with ID ${request.params["id"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    return sensorDataResponse;
  }

  sensorDataResponse = {
    statusCode: 200,
    content: {
      data: Object.values(sensorList.sensorData),
    },
    ...response.locals["defaultProperties"],
  };

  return sensorDataResponse;
}

/**
 * Possible statusCodes: 201, 400, 503
 * @param request
 * @param response
 * @returns
 */
export async function addSensorHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const sensorList = request.app.get("sensorList") as SensorList;
  let sensorDataResponse: SuccessResponse | ErrorResponse;

  const newSensor = {
    name: request.body["name"],
    model: request.body["model"],
    address: request.body["address"],
    color: request.body["color"],
  } as SDBSensor;

  let missingFields: Array<string> = [];
  if (!newSensor.name) {
    missingFields.push("Missing required field: name");
  }
  if (!newSensor.model) {
    missingFields.push("Missing required field: model");
  }
  if (!newSensor.address) {
    missingFields.push("Missing required field: address");
  }

  if (missingFields.length > 0) {
    sensorDataResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [...missingFields],
      },
      ...response.locals["defaultProperties"],
    };
    return sensorDataResponse;
  }

  try {
    await sprootDB.addSensorAsync(newSensor);
    await sensorList.initializeOrRegenerateAsync();

    sensorDataResponse = {
      statusCode: 201,
      content: {
        data: newSensor,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    sensorDataResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to add sensor to database", error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return sensorDataResponse;
}

/**
 * Possible statusCodes: 200, 400, 404, 503
 * @param request
 * @param response
 * @returns
 **/
export async function updateSensorHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const sensorList = request.app.get("sensorList") as SensorList;
  let updateSensorResponse: SuccessResponse | ErrorResponse;

  let sensorId: number;
  // If sensorId is an array, get the last element.
  if (!Array.isArray(request.params["id"])) {
    sensorId = parseInt([request.params["id"]].at(-1) ?? "");
  } else {
    sensorId = parseInt(request.params["id"]);
  }
  if (isNaN(sensorId)) {
    updateSensorResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid sensor Id."],
      },
      ...response.locals["defaultProperties"],
    };

    return updateSensorResponse;
  }

  let sensorData = sensorList.sensorData[sensorId] as SDBSensor;

  if (!sensorData) {
    updateSensorResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Sensor with ID ${sensorId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };
    return updateSensorResponse;
  }

  sensorData.name = request.body["name"] ?? sensorData.name;
  sensorData.model = request.body["model"] ?? sensorData.model;
  sensorData.address = request.body["address"] ?? sensorData.address;
  sensorData.color = request.body["color"] ?? sensorData.color;

  try {
    await sprootDB.updateSensorAsync(sensorData);
  } catch (error) {
    updateSensorResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to update sensor in database."],
      },
      ...response.locals["defaultProperties"],
    };
    return updateSensorResponse;
  }

  updateSensorResponse = {
    statusCode: 200,
    content: {
      data: sensorData,
    },
    ...response.locals["defaultProperties"],
  };
  return updateSensorResponse;
}

/**
 * Possible statusCodes: 204, 400, 404, 503
 * @param request
 * @param response
 * @returns
 */
export async function deleteSensorHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const sensorList = request.app.get("sensorList") as SensorList;
  let deleteSensorResponse: SuccessResponse | ErrorResponse;

  let sensorId: number;
  // If sensorId is an array, get the last element.
  if (!Array.isArray(request.params["id"])) {
    sensorId = parseInt([request.params["id"]].at(-1) ?? "");
  } else {
    sensorId = parseInt(request.params["id"]);
  }
  if (isNaN(sensorId)) {
    deleteSensorResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid sensor Id."],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteSensorResponse;
  }

  if (sensorList.sensorData[sensorId] === undefined) {
    deleteSensorResponse = {
      statusCode: 404,
      ...response.locals["defaultProperties"],
    };
    return deleteSensorResponse;
  }

  try {
    await sprootDB.deleteSensorAsync(sensorId);
    await sensorList.initializeOrRegenerateAsync();

    deleteSensorResponse = {
      statusCode: 204,
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    deleteSensorResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to delete sensor from database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return deleteSensorResponse;
}
