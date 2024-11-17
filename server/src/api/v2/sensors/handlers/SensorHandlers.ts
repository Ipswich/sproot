import { SensorList } from "../../../../sensors/list/SensorList";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBSensor } from "@sproot/database/SDBSensor";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 * @returns
 */
export function get(request: Request, response: Response): SuccessResponse | ErrorResponse {
  const sensorList = request.app.get("sensorList") as SensorList;
  let getSensorResponse: SuccessResponse | ErrorResponse;

  if (request.params["sensorId"] !== undefined) {
    if (sensorList.sensorData[request.params["sensorId"]]) {
      getSensorResponse = {
        statusCode: 200,
        content: {
          data: [sensorList.sensorData[request.params["sensorId"]]],
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      getSensorResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Sensor with ID ${request.params["sensorId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    return getSensorResponse;
  }

  getSensorResponse = {
    statusCode: 200,
    content: {
      data: Object.values(sensorList.sensorData),
    },
    ...response.locals["defaultProperties"],
  };

  return getSensorResponse;
}

/**
 * Possible statusCodes: 201, 400, 503
 * @param request
 * @param response
 * @returns
 */
export async function addAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const sensorList = request.app.get("sensorList") as SensorList;
  let addSensorResponse: SuccessResponse | ErrorResponse;

  const newSensor = {
    name: request.body["name"],
    model: request.body["model"],
    address: request.body["address"],
    color: request.body["color"],
  } as SDBSensor;

  const missingFields: Array<string> = [];
  if (newSensor.name == undefined || newSensor.name == null) {
    missingFields.push("Missing required field: name");
  }
  if (newSensor.model == undefined || newSensor.name == null) {
    missingFields.push("Missing required field: model");
  }
  if (newSensor.address == undefined || newSensor.name == null) {
    missingFields.push("Missing required field: address");
  }

  if (missingFields.length > 0) {
    addSensorResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [...missingFields],
      },
      ...response.locals["defaultProperties"],
    };
    return addSensorResponse;
  }

  try {
    await sprootDB.addSensorAsync(newSensor);
    await sensorList.initializeOrRegenerateAsync();

    addSensorResponse = {
      statusCode: 201,
      content: {
        data: newSensor,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    addSensorResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to add sensor to database", error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return addSensorResponse;
}

/**
 * Possible statusCodes: 200, 400, 404, 503
 * @param request
 * @param response
 * @returns
 **/
export async function updateAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const sensorList = request.app.get("sensorList") as SensorList;
  let updateSensorResponse: SuccessResponse | ErrorResponse;

  const sensorId = parseInt(request.params["sensorId"] ?? "");
  if (isNaN(sensorId)) {
    updateSensorResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing sensor ID."],
      },
      ...response.locals["defaultProperties"],
    };

    return updateSensorResponse;
  }

  const sensorData = sensorList.sensorData[sensorId] as SDBSensor;

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
    await sensorList.initializeOrRegenerateAsync();
  } catch (error: any) {
    updateSensorResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to update sensor in database.", error.message],
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
 * Possible statusCodes: 200, 400, 404, 503
 * @param request
 * @param response
 * @returns
 */
export async function deleteAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const sensorList = request.app.get("sensorList") as SensorList;
  let deleteSensorResponse: SuccessResponse | ErrorResponse;

  const sensorId = parseInt(request.params["sensorId"] ?? "");
  if (isNaN(sensorId)) {
    deleteSensorResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing sensor ID."],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteSensorResponse;
  }

  if (sensorList.sensorData[sensorId] === undefined) {
    deleteSensorResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Sensor with ID ${sensorId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };
    return deleteSensorResponse;
  }

  try {
    await sprootDB.deleteSensorAsync(sensorId);
    await sensorList.initializeOrRegenerateAsync();

    deleteSensorResponse = {
      statusCode: 200,
      content: {
        data: "Sensor deleted successfully.",
      },
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
