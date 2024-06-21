import { OutputList } from "../../../../outputs/list/OutputList";
// import { ISprootDB } from "@sproot/database/ISprootDB";
// import { SDBOutput } from "@sproot/database/SDBOutput";
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
export function getOutputHandler(
  request: Request,
  response: Response,
): SuccessResponse | ErrorResponse {
  const outputList = request.app.get("outputList") as OutputList;
  let getOutputResponse: SuccessResponse | ErrorResponse;

  if (request.params["id"] !== undefined) {
    if (outputList.outputData[request.params["id"]]) {
      getOutputResponse = {
        statusCode: 200,
        content: {
          data: [outputList.outputData[request.params["id"]]],
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      getOutputResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Output with Id ${request.params["id"]} not found.`],
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
export async function addOutputHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const outputList = request.app.get("outputList") as OutputList;
  let addOutputResponse: SuccessResponse | ErrorResponse;

  const newOutput = {
    model: request.body["model"],
    address: request.body["address"],
    name: request.body["name"],
    pin: request.body["pin"],
    isPwm: request.body["isPwm"],
    isInvertedPwm: request.body["isInvertedPwm"],
    color: request.body["color"],
  } as SDBOutput;

  const missingFields: Array<string> = [];
  if (newOutput.model == undefined || newOutput.model == null) {
    missingFields.push("Missing required field: model");
  }
  if (newOutput.address == undefined || newOutput.model == null) {
    missingFields.push("Missing required field: address");
  }
  if (newOutput.name == undefined || newOutput.model == null) {
    missingFields.push("Missing required field: name");
  }
  if (newOutput.pin == undefined || newOutput.model == null) {
    missingFields.push("Missing required field: pin");
  }
  if (newOutput.isPwm == undefined || newOutput.model == null) {
    missingFields.push("Missing required field: isPwm");
  }
  if (newOutput.isInvertedPwm == undefined || newOutput.model == null) {
    missingFields.push("Missing required field: isInvertedPwm");
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
    await outputList.initializeOrRegenerateAsync();
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
        details: ["Failed to add output to database", error.message],
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
export async function updateOutputHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const outputList = request.app.get("outputList") as OutputList;
  let updateOutputResponse: SuccessResponse | ErrorResponse;

  const outputId = parseInt(request.params["id"] ?? "");
  if (isNaN(outputId)) {
    updateOutputResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid output Id."],
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
        details: [`Output with Id ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return updateOutputResponse;
  }

  outputData.model = request.body["model"] ?? outputData.model;
  outputData.address = request.body["address"] ?? outputData.address;
  outputData.name = request.body["name"] ?? outputData.name;
  outputData.pin = request.body["pin"] ?? outputData.pin;
  outputData.isPwm = request.body["isPwm"] ?? outputData.isPwm;
  outputData.isInvertedPwm = request.body["isInvertedPwm"] ?? outputData.isInvertedPwm;
  outputData.color = request.body["color"] ?? outputData.color;

  try {
    await sprootDB.updateOutputAsync(outputData);
    await outputList.initializeOrRegenerateAsync();
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
