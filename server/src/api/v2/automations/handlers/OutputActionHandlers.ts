import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";
import { SprootDB } from "../../../../database/SprootDB";

/**
 * Possible statusCodes: 200, 401, 503
 * @param request
 * @param response
 */
export async function getAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let automationResponse: SuccessResponse | ErrorResponse;

  try {
    if (
      request.query["automationId"] != null &&
      !isNaN(parseInt(request.query["automationId"] as string))
    ) {
      const automations = await sprootDB.getOutputActionsByAutomationIdAsync(
        parseInt(request.query["automationId"] as string),
      );
      automationResponse = {
        statusCode: 200,
        content: {
          data: automations,
        },
        ...response.locals["defaultProperties"],
      };
      return automationResponse;
    }

    const actions = await sprootDB.getOutputActionsAsync();
    automationResponse = {
      statusCode: 200,
      content: {
        data: actions,
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
export async function getByIdAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let automationResponse: SuccessResponse | ErrorResponse;

  if (
    request.params["outputActionId"] == null ||
    isNaN(parseInt(request.params["outputActionId"]))
  ) {
    automationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing outputAction Id."],
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }

  try {
    const outputActionId = parseInt(request.params["outputActionId"] ?? "");
    const automation = (await sprootDB.getOutputActionAsync(outputActionId))[0];
    if (automation == null) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`OutputAction with Id ${request.params["outputActionId"]} not found.`],
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
 * Possible statusCodes: 201, 400, 401, 404, 503
 * @param request
 * @param response
 * @returns
 */
export async function addAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get("outputList") as OutputList;
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  let automationResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.body["automationId"] ?? "");
  const outputId = parseInt(request.body["outputId"] ?? "");
  const value = parseInt(request.body["value"] ?? "");

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
  }
  if (isNaN(outputId)) {
    invalidFields.push("Invalid or missing output Id.");
  } else if (outputList.outputs[outputId] == null) {
    automationResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: ["Output not found."],
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }
  if (isNaN(value)) {
    invalidFields.push("Invalid or missing value.");
  } else {
    if (value < 0 || value > 100) {
      invalidFields.push("Value must be between 0 and 100.");
    }
    if (!outputList.outputs[outputId]?.isPwm && value != 0 && value != 100) {
      invalidFields.push("Value must be 0 or 100 for PWM outputs.");
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
    if ((await sprootDB.getAutomationAsync(automationId)).length == 0) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: ["Automation not found."],
        },
        ...response.locals["defaultProperties"],
      };
      return automationResponse;
    }

    const automation = await automationDataManager.addOutputActionAsync(
      automationId,
      outputId,
      value,
    );
    automationResponse = {
      statusCode: 201,
      content: {
        data: { id: automation, outputId: outputId, automationId: automationId, value: value },
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
export async function deleteAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  let automationResponse: SuccessResponse | ErrorResponse;

  if (
    request.params["outputActionId"] == null ||
    isNaN(parseInt(request.params["outputActionId"]))
  ) {
    automationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing output action Id."],
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }

  try {
    const automationId = parseInt(request.params["outputActionId"] ?? "");
    const automation = (await sprootDB.getOutputActionAsync(automationId))[0];
    if (automation == null) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`OutputAction with Id ${request.params["outputActionId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return automationResponse;
    }

    await automationDataManager.deleteOutputActionAsync(automationId);
    automationResponse = {
      statusCode: 200,
      content: {
        data: "Output action deleted successfully.",
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
