import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { AutomationService } from "../../../../automation/AutomationService";
import { IAutomation } from "@sproot/automation/IAutomation";
import { ISprootDB } from "@sproot/database/ISprootDB";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import type { operations as AutomationContractOperations } from "@sproot/sproot-common/dist/api/generated/automations/types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type CreateAutomationRequestBody =
  AutomationContractOperations["createAutomation"]["requestBody"]["content"]["application/json"];
type UpdateAutomationPathParams =
  AutomationContractOperations["updateAutomation"]["parameters"]["path"];
type UpdateAutomationRequestBody =
  AutomationContractOperations["updateAutomation"]["requestBody"]["content"]["application/json"];
type GetAutomationByIdPathParams =
  AutomationContractOperations["getAutomationById"]["parameters"]["path"];
type DeleteAutomationPathParams =
  AutomationContractOperations["deleteAutomation"]["parameters"]["path"];

/**
 * Possible statusCodes: 200, 401, 503
 * @param request
 * @param response
 * @returns
 */
export async function getAsync(request: Request, response: Response) {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  let automationResponse: SuccessResponse | ErrorResponse;
  try {
    const automations = await sprootDB.getAutomationsAsync();
    automationResponse = {
      statusCode: 200,
      content: {
        data: automations,
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
export async function getByIdAsync(request: Request, response: Response) {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const pathParams = (getValidatedContractRequestData<"getAutomationById">(response).params ??
    request.params) as GetAutomationByIdPathParams;
  const automationId = pathParams["automationId"];
  let automationResponse: SuccessResponse | ErrorResponse;
  if (automationId == null || isNaN(parseInt(automationId))) {
    automationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing automation Id."],
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }

  try {
    const automation = (await sprootDB.getAutomationAsync(parseInt(automationId)))[0];
    if (automation == null) {
      return {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${automationId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    automationResponse = {
      statusCode: 200,
      content: {
        data: automation,
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
 * Possible statusCodes: 201, 400, 401, 503
 * @param request
 * @param response
 * @returns
 */
export async function addAsync(request: Request, response: Response) {
  const automationService = request.app.get(DI_KEYS.AutomationService) as AutomationService;
  const requestBody = (getValidatedContractRequestData<"createAutomation">(response).body ??
    request.body) as CreateAutomationRequestBody;
  let addAutomationResponse: SuccessResponse | ErrorResponse;
  const automationName = requestBody["name"];
  const automationOperator = requestBody["operator"];

  try {
    const createdAutomationId = await automationService.addAutomationAsync(
      automationName,
      automationOperator,
    );
    addAutomationResponse = {
      statusCode: 201,
      content: {
        data: {
          id: createdAutomationId,
          name: automationName,
          operator: automationOperator,
        } as IAutomation,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    addAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [(error as Error).message],
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
export async function updateAsync(request: Request, response: Response) {
  const automationService = request.app.get(DI_KEYS.AutomationService) as AutomationService;
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const validatedRequest = getValidatedContractRequestData<"updateAutomation">(response);
  const pathParams = (validatedRequest.params ?? request.params) as UpdateAutomationPathParams;
  const requestBody = (validatedRequest.body ?? request.body) as UpdateAutomationRequestBody;
  const automationId = pathParams["automationId"];
  let updateAutomationResponse: SuccessResponse | ErrorResponse;
  if (automationId == null || isNaN(parseInt(automationId))) {
    updateAutomationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing automation Id."],
      },
      ...response.locals["defaultProperties"],
    };
    return updateAutomationResponse;
  }

  try {
    const automation = (await sprootDB.getAutomationAsync(parseInt(automationId)))[0];
    if (automation == null) {
      updateAutomationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${automationId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return updateAutomationResponse;
    }

    automation.name = requestBody["name"] ?? automation.name;
    automation.operator = requestBody["operator"] ?? automation.operator;
    automation.enabled = requestBody["enabled"] ?? automation.enabled;
    await automationService.updateAutomationAsync(
      parseInt(automationId),
      automation.name,
      automation.operator,
      automation.enabled,
    );
    updateAutomationResponse = {
      statusCode: 200,
      content: {
        data: automation,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    updateAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [(error as Error).message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return updateAutomationResponse;
}

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request
 * @param response
 * @returns
 */
export async function deleteAsync(request: Request, response: Response) {
  const automationService = request.app.get(DI_KEYS.AutomationService) as AutomationService;
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const pathParams = (getValidatedContractRequestData<"deleteAutomation">(response).params ??
    request.params) as DeleteAutomationPathParams;
  const automationId = pathParams["automationId"];
  let deleteAutomationResponse: SuccessResponse | ErrorResponse;

  if (automationId == null || isNaN(parseInt(automationId))) {
    deleteAutomationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing automation Id."],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteAutomationResponse;
  }

  try {
    const automation = await sprootDB.getAutomationAsync(parseInt(automationId));
    if (automation.length == 0) {
      deleteAutomationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${automationId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return deleteAutomationResponse;
    }

    await automationService.deleteAutomationAsync(parseInt(automationId));

    deleteAutomationResponse = {
      statusCode: 200,
      content: {
        data: "Automation deleted successfully.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    deleteAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [(error as Error).message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return deleteAutomationResponse;
}
