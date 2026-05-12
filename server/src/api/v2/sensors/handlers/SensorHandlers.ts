import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { SDBSensor } from "@sproot/database/SDBSensor";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { ModelList, Models } from "@sproot/sproot-common/dist/sensors/Models";
import { SensorList } from "../../../../sensors/list/SensorList";
import type { operations as SensorContractOperations } from "@sproot/sproot-common/dist/api/generated/sensors/types";
import { ContractOperationPathParams } from "@sproot/sproot-common/dist/api/contracts/operation-types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type CreateSensorRequestBody =
  SensorContractOperations["createSensor"]["requestBody"]["content"]["application/json"];
type GetSensorByIdPathParams = ContractOperationPathParams<"getSensorById">;
type UpdateSensorPathParams = ContractOperationPathParams<"updateSensor">;
type UpdateSensorRequestBody =
  SensorContractOperations["updateSensor"]["requestBody"]["content"]["application/json"];
type DeleteSensorPathParams = ContractOperationPathParams<"deleteSensor">;

type SensorUpdateFallbackBody = {
  subcontrollerId?: number | null;
  pin?: string | null;
  lowCalibrationPoint?: number | null;
  highCalibrationPoint?: number | null;
  deviceZoneId?: number | null;
};

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 * @returns
 */
export function get(request: Request, response: Response): SuccessResponse | ErrorResponse {
  const sensorList = request.app.get(DI_KEYS.SensorList) as SensorList;
  let getSensorResponse: SuccessResponse | ErrorResponse;
  const validatedPathParams = getValidatedContractRequestData<"getSensorById">(response).params as
    | GetSensorByIdPathParams
    | undefined;
  const sensorId = validatedPathParams?.["sensorId"] ?? request.params["sensorId"];

  if (sensorId !== undefined) {
    if (sensorList.sensorData[sensorId]) {
      getSensorResponse = {
        statusCode: 200,
        content: {
          data: [sensorList.sensorData[sensorId]],
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      getSensorResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Sensor with ID ${sensorId} not found.`],
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
  const sensorList = request.app.get(DI_KEYS.SensorList) as SensorList;
  const requestBody = (getValidatedContractRequestData<"createSensor">(response).body ??
    request.body) as CreateSensorRequestBody;
  let addSensorResponse: SuccessResponse | ErrorResponse;

  const newSensor = {
    name: requestBody["name"],
    model: requestBody["model"],
    subcontrollerId: requestBody["subcontrollerId"],
    address: requestBody["address"],
    color: requestBody["color"],
    pin: requestBody["pin"],
  } as SDBSensor;

  const validationErrors: Array<string> = [];
  if (
    newSensor.model !== undefined &&
    newSensor.model !== null &&
    !Object.keys(Models)
      .map((key) => key)
      .includes(newSensor.model)
  ) {
    validationErrors.push(
      `Invalid model: ${newSensor.model}. Supported models are: ${Object.keys(Models).join(", ")}`,
    );
  }
  if (
    newSensor.model == ModelList.ADS1115 ||
    newSensor.model == ModelList.CAPACITIVE_MOISTURE_SENSOR
  ) {
    if (newSensor.pin == undefined || newSensor.pin == null) {
      validationErrors.push("Missing required field: pin");
    }
  }

  if (validationErrors.length > 0) {
    addSensorResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [...validationErrors],
      },
      ...response.locals["defaultProperties"],
    };
    return addSensorResponse;
  }

  try {
    await sensorList.addSensorAsync(newSensor);

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
  const sensorList = request.app.get(DI_KEYS.SensorList) as SensorList;
  const validatedRequest = getValidatedContractRequestData<"updateSensor">(response);
  const pathParams = (validatedRequest.params ?? request.params) as UpdateSensorPathParams;
  const requestBody = request.body as SensorUpdateFallbackBody;
  const validatedBody = (validatedRequest.body ?? request.body) as UpdateSensorRequestBody;
  let updateSensorResponse: SuccessResponse | ErrorResponse;

  const sensorIdValue = pathParams["sensorId"];
  const sensorId =
    typeof sensorIdValue === "number" ? sensorIdValue : parseInt(sensorIdValue ?? "", 10);
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

  sensorData.name = validatedBody["name"] ?? sensorData.name;
  sensorData.model = (validatedBody["model"] as SDBSensor["model"] | undefined) ?? sensorData.model;
  sensorData.address = validatedBody["address"] ?? sensorData.address;
  sensorData.color = validatedBody["color"] ?? sensorData.color;
  sensorData.subcontrollerId = requestBody["subcontrollerId"] ?? sensorData.subcontrollerId;
  sensorData.pin = requestBody["pin"] ?? sensorData.pin;
  sensorData.lowCalibrationPoint =
    requestBody["lowCalibrationPoint"] ?? sensorData.lowCalibrationPoint;
  sensorData.highCalibrationPoint =
    requestBody["highCalibrationPoint"] ?? sensorData.highCalibrationPoint;
  sensorData.deviceZoneId = requestBody["deviceZoneId"] ?? sensorData.deviceZoneId;

  try {
    await sensorList.updateSensorAsync(sensorData);
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
  const sensorList = request.app.get(DI_KEYS.SensorList) as SensorList;
  const pathParams = (getValidatedContractRequestData<"deleteSensor">(response).params ??
    request.params) as DeleteSensorPathParams;
  let deleteSensorResponse: SuccessResponse | ErrorResponse;

  const sensorIdValue = pathParams["sensorId"];
  const sensorId =
    typeof sensorIdValue === "number" ? sensorIdValue : parseInt(sensorIdValue ?? "", 10);
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
    await sensorList.deleteSensorAsync(sensorId);

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
