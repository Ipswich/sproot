import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";
import { SprootDB } from "../../../../database/SprootDB";
import { ISprootDB } from "@sproot/database/ISprootDB";

/**
 * Possible statusCodes: 200, 401, 503
 * @param request 
 * @param response 
 */
export async function getAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let automationResponse: SuccessResponse | ErrorResponse;

  try {
    const automations = await sprootDB.getOutputAutomationsAsync();
    automationResponse = {
      statusCode: 200,
      content: {
        data: automations,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    automationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return automationResponse;
}

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function getByIdAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let automationResponse: SuccessResponse | ErrorResponse;

  if (request.params["outputAutomationId"] == null || isNaN(parseInt(request.params["outputAutomationId"]))) {
    automationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing outputAutomation Id."],
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }

  try {
    const automationId = parseInt(request.params["outputAutomationId"] ?? "");
    const automation = (await sprootDB.getOutputAutomationAsync(automationId))[0];
    if (automation == null) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`OutputAutomation with Id ${request.params["outputAutomationId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return automationResponse;
    }

    automationResponse = {
      statusCode: 200,
      content: {
        data: automation,
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  } catch (error: any) {
    automationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return automationResponse;
}

/**
 * Possible statusCodes: 201, 400, 401, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function addAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  let automationResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.body["automationId"] ?? "");
  const value = parseInt(request.body["value"] ?? "");

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
  }
  if (isNaN(value)) {
    invalidFields.push("Invalid or missing value.");
  } else {
    if (value < 0 || value > 100) {
      invalidFields.push("Value must be between 0 and 100.");
    }
  }
  if (invalidFields.length > 0) {
    automationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: invalidFields,
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }

  try {
    const automation = await automationDataManager.addOutputAutomationAsync(automationId, value);
    automationResponse = {
      statusCode: 201,
      content: {
        data: { id: automation, automationId: automationId, value: value },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    automationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return automationResponse;
}

/**
 * Possible statusCode: 200, 400, 401, 404, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function updateAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  let automationResponse: SuccessResponse | ErrorResponse;

  const outputAutomationId = parseInt(request.params["outputAutomationId"] ?? "");
  const automationId = parseInt(request.body["automationId"] ?? "");
  const value = parseInt(request.body["value"] ?? "");

  const invalidFields = [];
  if (isNaN(outputAutomationId)) {
    invalidFields.push("Invalid or missing output automation Id.");
  }
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
  }
  if (isNaN(value)) {
    invalidFields.push("Invalid or missing value.");
  }

  if (invalidFields.length > 0) {
    automationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: invalidFields
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }

  try {
    const missingFields = [];
    const automation = (await sprootDB.getAutomationAsync(automationId))[0];
    if (automation == null) {
      missingFields.push(`Automation with Id ${automationId} not found.`);
    }
    const outputAutomation = (await sprootDB.getOutputAutomationAsync(outputAutomationId))[0];
    if (outputAutomation == null) {
      missingFields.push(`OutputAutomation with Id ${outputAutomationId} not found.`);
    }
    if (missingFields.length > 0) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: missingFields,
        },
        ...response.locals["defaultProperties"],
      };
      return automationResponse;
    }

    await automationDataManager.updateOutputAutomationAsync(outputAutomationId, automationId, value);
    automationResponse = {
      statusCode: 200,
      content: {
        data: { id: outputAutomationId, automationId: automationId, value: value },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    automationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return automationResponse;
}

/**
 * Possible statusCodes: 200, 400, 401, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function deleteAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  let automationResponse: SuccessResponse | ErrorResponse;

  if (request.params["outputAutomationId"] == null || isNaN(parseInt(request.params["outputAutomationId"]))) {
    automationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing output automation Id."],
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }

  try {
    const automationId = parseInt(request.params["outputAutomationId"] ?? "");
    const automation = (await sprootDB.getOutputAutomationAsync(automationId))[0];
    if (automation == null) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`OutputAutomation with Id ${request.params["outputAutomationId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return automationResponse;
    }

    await automationDataManager.deleteOutputAutomationAsync(automationId);
    automationResponse = {
      statusCode: 200,
      content: {
        data: "Output automation deleted successfully.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    automationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return automationResponse;
}

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param req 
 * @param res 
 */
export async function addOutputToOutputAutomationAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  const outputList = request.app.get("outputList") as OutputList;
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let addAutomationResponse: SuccessResponse | ErrorResponse;

  try {
    const invalidParams = await verifyParamsAsync(request, response, outputList, sprootDB)
    if (invalidParams != null) {
      return invalidParams
    }

    const outputAutomationId = parseInt(request.params["outputAutomationId"] ?? "");
    const outputId = parseInt(request.params["outputId"] ?? "");

    await automationDataManager.addOutputToOutputAutomationAsync(outputId, outputAutomationId);
    addAutomationResponse = {
      statusCode: 200,
      content: {
        data: "Output added to OutputAutomation successfully.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    addAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
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
export async function deleteOutputFromOutputAutomationAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  const outputList = request.app.get("outputList") as OutputList;
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let deleteAutomationResponse: SuccessResponse | ErrorResponse;

  try {
    const invalidParams = await verifyParamsAsync(request, response, outputList, sprootDB)
    if (invalidParams != null) {
      return invalidParams;
    }

    const outputAutomationId = parseInt(request.params["outputAutomationId"] ?? "");
    const outputId = parseInt(request.params["outputId"] ?? "");

    await automationDataManager.deleteOutputFromOutputAutomationAsync(outputId, outputAutomationId);
    deleteAutomationResponse = {
      statusCode: 200,
      content: {
        data: "Output deleted from Output Automation successfully.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    deleteAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
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

  const outputAutomationId = parseInt(request.params["outputAutomationId"] ?? "");
  const outputId = parseInt(request.params["outputId"] ?? "");

  const invalidFields = [];
  if (isNaN(outputAutomationId)) {
    invalidFields.push("Invalid or missing output automation Id.");
  }
  if (isNaN(outputId)) {
    invalidFields.push("Invalid or missing output Id.");
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
  if ((await sprootDB.getOutputAutomationAsync(outputAutomationId)).length == 0) {
    notFoundFields.push(`OutputAutomation with Id ${request.params["outputAutomationId"]} not found.`);
  }
  if (outputList.outputs[outputId] == null) {
    notFoundFields.push(`Output with Id ${request.params["outputId"]} not found.`);
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