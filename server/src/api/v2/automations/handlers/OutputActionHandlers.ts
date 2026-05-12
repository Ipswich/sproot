import { ISprootDB } from "@sproot/database/ISprootDB";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";
import { AutomationService } from "../../../../automation/AutomationService";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import type { operations as AutomationContractOperations } from "@sproot/sproot-common/dist/api/generated/automations/types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type ListOutputActionsQuery =
  AutomationContractOperations["listOutputActions"]["parameters"]["query"];
type CreateOutputActionRequestBody =
  AutomationContractOperations["createOutputAction"]["requestBody"]["content"]["application/json"];

/**
 * Possible statusCodes: 200, 401, 503
 * @param request
 * @param response
 */
export async function getAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const query = (getValidatedContractRequestData<"listOutputActions">(response).query ??
    request.query) as ListOutputActionsQuery;
  const automationId = query?.["automationId"];
  let automationResponse: SuccessResponse | ErrorResponse;

  try {
    if (automationId != null && !isNaN(parseInt(automationId))) {
      const automations = await sprootDB.getOutputActionsByAutomationIdAsync(
        parseInt(automationId),
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
  } catch (error) {
    automationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [(error as Error).message],
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
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
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
  } catch (error) {
    automationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [(error as Error).message],
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
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const automationService = request.app.get(DI_KEYS.AutomationService) as AutomationService;
  const requestBody = (getValidatedContractRequestData<"createOutputAction">(response).body ??
    request.body) as CreateOutputActionRequestBody;
  let automationResponse: SuccessResponse | ErrorResponse;

  const automationId = requestBody["automationId"];
  const outputId = requestBody["outputId"];
  let value = requestBody["value"];

  const invalidFields = [];
  if (outputList.outputs[outputId] == null) {
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
  if (value < 0 || value > 100) {
    invalidFields.push("Value must be between 0 and 100.");
  }
  if (!outputList.outputs[outputId]?.isPwm && value != 0 && value != 100) {
    // Value should be set to 100 if it's greater than 0 since non-PWM outputs only support on/off states
    value = value > 0 ? 100 : 0;
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

    const automation = await automationService.addOutputActionAsync(automationId, outputId, value);
    automationResponse = {
      statusCode: 201,
      content: {
        data: { id: automation, outputId: outputId, automationId: automationId, value: value },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    automationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [(error as Error).message],
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
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const automationService = request.app.get(DI_KEYS.AutomationService) as AutomationService;
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
    const outputActionId = parseInt(request.params["outputActionId"] ?? "");
    const action = (await sprootDB.getOutputActionAsync(outputActionId))[0];
    if (action == null) {
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

    await automationService.deleteOutputActionAsync(outputActionId);
    automationResponse = {
      statusCode: 200,
      content: {
        data: "Output action deleted successfully.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    automationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [(error as Error).message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return automationResponse;
}
