import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { SDBSensor } from "@sproot/database/SDBSensor";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { I2C_SENSOR_ADDRESSES, I2C_SENSOR_PINS, Models } from "@sproot/common/sensors/Models";
import { SensorList } from "../../../../sensors/list/SensorList";

function validateAddress(model: string, address: string | null | undefined): string | null {
  if (address == null || address === "") return "address";

  // DS18B20 validation: 16 chars, starts with "28", hex digits only
  if (model === "DS18B20" || model === "ESP32_DS18B20") {
    if (address.length !== 16 || !address.startsWith("28")) {
      return "address";
    }
    if (!/^[0-9a-fA-F]+$/.test(address.replace(/-/g, ""))) {
      return "address";
    }
    return null;
  }

  // I2C sensor validation: address must be in static list
  if (model in I2C_SENSOR_ADDRESSES) {
    const addresses = I2C_SENSOR_ADDRESSES[model as keyof typeof I2C_SENSOR_ADDRESSES]!;
    if (!addresses.includes(address)) {
      return "address";
    }
    return null;
  }

  // Unknown model — no address validation
  return null;
}

function validatePin(model: string, pin: string | null | undefined): string | null {
  // Models with no pins - null/undefined is valid, any provided value is invalid
  if (
    model === "DS18B20" ||
    model === "ESP32_DS18B20" ||
    model === "BME280" ||
    model === "ESP32_BME280"
  ) {
    if (pin != null && pin !== "") {
      return "pin";
    }
    return null;
  }

  // Other models: pin must be provided
  if (pin == null || pin === "") return "pin";

  // I2C sensor validation: pin must be in static list
  if (model in I2C_SENSOR_PINS) {
    const pins = I2C_SENSOR_PINS[model as keyof typeof I2C_SENSOR_PINS]!;
    if (!pins.includes(pin)) {
      return "pin";
    }
    return null;
  }

  // Unknown model — no pin validation
  return null;
}

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 * @returns
 */
export function get(request: Request, response: Response): SuccessResponse | ErrorResponse {
  const sensorList = request.app.get(DI_KEYS.SensorList) as SensorList;
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
  const sensorList = request.app.get(DI_KEYS.SensorList) as SensorList;
  let addSensorResponse: SuccessResponse | ErrorResponse;

  const newSensor = {
    name: request.body["name"],
    model: request.body["model"],
    subcontrollerId: request.body["subcontrollerId"],
    address: request.body["address"],
    color: request.body["color"],
    pin: request.body["pin"],
  } as SDBSensor;

  const missingFields: Array<string> = [];
  if (newSensor.name == undefined || newSensor.name == null) {
    missingFields.push("Missing required field: name");
  }
  if (newSensor.model == undefined || newSensor.model == null) {
    missingFields.push("Missing required field: model");
  } else if (
    !Object.keys(Models)
      .map((key) => key)
      .includes(newSensor.model)
  ) {
    missingFields.push(
      `Invalid model: ${newSensor.model}. Supported models are: ${Object.keys(Models).join(", ")}`,
    );
  }
  const addressValidation = validateAddress(newSensor.model, newSensor.address);
  if (addressValidation) {
    missingFields.push(`Invalid address for model ${newSensor.model}`);
  }
  const pinValidation = validatePin(newSensor.model, newSensor.pin);
  if (pinValidation) {
    missingFields.push(`Invalid pin for model ${newSensor.model}`);
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
  sensorData.subcontrollerId = request.body["subcontrollerId"] ?? sensorData.subcontrollerId;
  sensorData.address = request.body["address"] ?? sensorData.address;
  sensorData.color = request.body["color"] ?? sensorData.color;
  sensorData.pin = request.body["pin"] ?? sensorData.pin;
  sensorData.lowCalibrationPoint =
    request.body["lowCalibrationPoint"] ?? sensorData.lowCalibrationPoint;
  sensorData.highCalibrationPoint =
    request.body["highCalibrationPoint"] ?? sensorData.highCalibrationPoint;
  sensorData.deviceZoneId =
    request.body["deviceZoneId"] ?? request.body["deviceZoneId"] ?? sensorData.deviceZoneId;

  const updateDetails: string[] = [];
  if (request.body["address"] !== undefined) {
    const addressValidation = validateAddress(sensorData.model, request.body["address"]);
    if (addressValidation) {
      updateDetails.push(`Invalid address for model ${sensorData.model}`);
    }
  }
  if (request.body["pin"] !== undefined) {
    const pinValidation = validatePin(sensorData.model, request.body["pin"]);
    if (pinValidation) {
      updateDetails.push(`Invalid pin for model ${sensorData.model}`);
    }
  }
  if (updateDetails.length > 0) {
    updateSensorResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: updateDetails,
      },
      ...response.locals["defaultProperties"],
    };
    return updateSensorResponse;
  }

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
