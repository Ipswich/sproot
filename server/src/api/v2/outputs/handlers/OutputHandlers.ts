import { OutputList } from "../../../../outputs/list/OutputList";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { SDBOutput } from "@sproot/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { Request, Response } from "express";

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 * @returns
 */
export function get(request: Request, response: Response): SuccessResponse | ErrorResponse {
  const outputList = request.app.get("outputList") as OutputList;
  let getOutputResponse: SuccessResponse | ErrorResponse;

  if (request.params["outputId"] !== undefined) {
    if (outputList.outputData[request.params["outputId"]]) {
      getOutputResponse = {
        statusCode: 200,
        content: {
          data: [outputList.outputData[request.params["outputId"]]],
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      getOutputResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Output with ID ${request.params["outputId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    return getOutputResponse;
  }

  getOutputResponse = {
    statusCode: 200,
    content: {
      data: Object.values(outputList.outputData),
    },
    ...response.locals["defaultProperties"],
  };
  return getOutputResponse;
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
  const outputList = request.app.get("outputList") as OutputList;
  let addOutputResponse: SuccessResponse | ErrorResponse;

  const newOutput = {
    model: request.body["model"],
    subcontrollerId: request.body["subcontrollerId"],
    address: request.body["address"],
    name: request.body["name"],
    pin: request.body["pin"],
    isPwm: request.body["isPwm"],
    isInvertedPwm: request.body["isInvertedPwm"],
    color: request.body["color"],
    automationTimeout: request.body["automationTimeout"],
  } as SDBOutput;

  const missingFields: Array<string> = [];
  if (newOutput.model == undefined || newOutput.model == null) {
    missingFields.push("Missing required field: model");
  }
  if (newOutput.address == undefined || newOutput.address == null) {
    missingFields.push("Missing required field: address");
  }
  if (newOutput.name == undefined || newOutput.name == null) {
    missingFields.push("Missing required field: name");
  }
  if (newOutput.pin == undefined || newOutput.pin == null) {
    missingFields.push("Missing required field: pin");
  }
  if (newOutput.isPwm == undefined || newOutput.isPwm == null) {
    missingFields.push("Missing required field: isPwm");
  }
  if (newOutput.isInvertedPwm == undefined || newOutput.isInvertedPwm == null) {
    missingFields.push("Missing required field: isInvertedPwm");
  }
  if (newOutput.automationTimeout == undefined || newOutput.automationTimeout == null) {
    missingFields.push("Missing required field: automationTimeout");
  }

  if (missingFields.length > 0) {
    addOutputResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [...missingFields],
      },
      ...response.locals["defaultProperties"],
    };
    return addOutputResponse;
  }

  try {
    await sprootDB.addOutputAsync(newOutput);
    await outputList.regenerateAsync();
    addOutputResponse = {
      statusCode: 201,
      content: {
        data: newOutput,
      },
      ...response.locals["defaultProperties"],
    };
    return addOutputResponse;
  } catch (error: any) {
    addOutputResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to add output to database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
    return addOutputResponse;
  }
}
/**
 * Possible statusCodes: 200, 400, 404, 503
 * @param request
 * @param response
 * @returns
 */
export async function updateAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const outputList = request.app.get("outputList") as OutputList;
  let updateOutputResponse: SuccessResponse | ErrorResponse;

  const outputId = parseInt(request.params["outputId"] ?? "");
  if (isNaN(outputId)) {
    updateOutputResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing output ID."],
      },
      ...response.locals["defaultProperties"],
    };

    return updateOutputResponse;
  }

  const outputData = outputList.outputData[outputId] as SDBOutput;

  if (!outputData) {
    updateOutputResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return updateOutputResponse;
  }

  outputData.model = request.body["model"] ?? outputData.model;
  outputData.subcontrollerId = request.body["subcontrollerId"] ?? outputData.subcontrollerId;
  outputData.address = request.body["address"] ?? outputData.address;
  outputData.name = request.body["name"] ?? outputData.name;
  outputData.pin = request.body["pin"] ?? outputData.pin;
  outputData.isPwm = request.body["isPwm"] ?? outputData.isPwm;
  outputData.isInvertedPwm = request.body["isInvertedPwm"] ?? outputData.isInvertedPwm;
  outputData.color = request.body["color"] ?? outputData.color;
  outputData.automationTimeout = request.body["automationTimeout"] ?? outputData.automationTimeout;
  outputData.deviceGroupId = request.body["deviceGroupId"] ?? outputData.deviceGroupId;

  try {
    await sprootDB.updateOutputAsync(outputData);
    await outputList.regenerateAsync();
  } catch (error: any) {
    updateOutputResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to update output in database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
    return updateOutputResponse;
  }

  updateOutputResponse = {
    statusCode: 200,
    content: {
      data: outputData,
    },
    ...response.locals["defaultProperties"],
  };
  return updateOutputResponse;
}

export async function deleteAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const outputList = request.app.get("outputList") as OutputList;
  let deleteOutputResponse: SuccessResponse | ErrorResponse;

  const outputId = parseInt(request.params["outputId"] ?? "");
  if (isNaN(outputId)) {
    deleteOutputResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing output ID."],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteOutputResponse;
  }

  const outputData = outputList.outputData[outputId] as SDBOutput;

  if (!outputData) {
    deleteOutputResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteOutputResponse;
  }

  try {
    await sprootDB.deleteOutputAsync(outputId);
    await outputList.regenerateAsync();

    deleteOutputResponse = {
      statusCode: 200,
      content: {
        data: "Output deleted successfully.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    deleteOutputResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to delete output from database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return deleteOutputResponse;
}
