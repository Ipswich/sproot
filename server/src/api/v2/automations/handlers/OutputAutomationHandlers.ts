import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";
import { SprootDB } from "../../../../database/SprootDB";
import { ISprootDB } from "@sproot/database/ISprootDB";

export function get(request: Request, response: Response): SuccessResponse {
  const outputList = request.app.get("outputList") as OutputList;
  const outputId = parseInt(request.params["outputId"] ?? "");
  if (isNaN(outputId)) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing output Id"],
      },
      ...response.locals["defaultProperties"],
    };
  }

  const output = outputList.outputs[outputId];

  if (output == null) {
    return {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with id ${outputId} not found`],
      },
      ...response.locals["defaultProperties"],
    };
  }

  const getResponse: SuccessResponse = {
    statusCode: 200,
    content: {
      data: [output.getAutomations()],
    },
    ...response.locals["defaultProperties"],
  };
  return getResponse;
}

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param req 
 * @param res 
 */
export async function addAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const automationsManager = request.app.get("automationDataManager") as AutomationDataManager;
  const outputList = request.app.get("outputList") as OutputList;
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let addAutomationResponse: SuccessResponse | ErrorResponse;

  try {
    const invalidParams = await verifyParamsAsync(request, response, outputList, sprootDB)
    if (invalidParams != null) {
      return invalidParams
    }

    const automationId = parseInt(request.params["automationId"] ?? "");
    const outputId = parseInt(request.params["outputId"] ?? "");

    await automationsManager.addOutputToAutomationAsync(outputId, automationId);
    addAutomationResponse = {
      statusCode: 200,
      content: {
        data: "Output added to automation",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    addAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return addAutomationResponse;
}

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function deleteAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const automationsManager = request.app.get("automationDataManager") as AutomationDataManager;
  const outputList = request.app.get("outputList") as OutputList;
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let deleteAutomationResponse: SuccessResponse | ErrorResponse;

  try {
    const invalidParams = await verifyParamsAsync(request, response, outputList, sprootDB)
    if (invalidParams != null) {
      return invalidParams;
    }

    const automationId = parseInt(request.params["automationId"] ?? "");
    const outputId = parseInt(request.params["outputId"] ?? "");

    await automationsManager.deleteOutputFromAutomationAsync(outputId, automationId);
    deleteAutomationResponse = {
      statusCode: 200,
      content: {
        data: "Output deleted from automation",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    deleteAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return deleteAutomationResponse;
}

async function verifyParamsAsync(
  request: Request,
  response: Response,
  outputList: OutputList,
  sprootDB: ISprootDB
): Promise<ErrorResponse | null> {
  let error: ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const outputId = parseInt(request.params["outputId"] ?? "");

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id");
  }
  if (isNaN(outputId)) {
    invalidFields.push("Invalid or missing output Id");
  }

  if (invalidFields.length > 0) {
    error = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: invalidFields,
      },
      ...response.locals["defaultProperties"],
    }
    return error;
  }

  const notFoundFields = [];
  if ((await sprootDB.getAutomationAsync(automationId)).length == 0) {
    notFoundFields.push(`Automation with id ${request.params["automationId"]} not found`);
  }
  if (outputList.outputs[outputId] == null) {
    notFoundFields.push(`Output with id ${request.params["outputId"]} not found`);
  }

  if (notFoundFields.length > 0) {
    error = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: notFoundFields,
      },
      ...response.locals["defaultProperties"],
    };
    return error;
  }

  return null;
}