import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { AutomationService } from "../../../../automation/AutomationService";
import { IAutomation } from "@sproot/automation/IAutomation";
import { ISprootDB } from "../../../../database/ISprootDB";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";

function serializeAutomation(automation: {
  id: number;
  name: string;
  operator: IAutomation["operator"];
  enabled?: boolean;
  triggered?: boolean;
  isTriggered?: boolean;
}): IAutomation {
  return {
    id: automation.id,
    name: automation.name,
    operator: automation.operator,
    enabled: automation.enabled ?? true,
    triggered: automation.triggered ?? automation.isTriggered ?? false,
  };
}

/**
 * Possible statusCodes: 200, 401, 503
 * @param request
 * @param response
 * @returns
 */
export async function getAsync(request: Request, response: Response) {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const automationService = request.app.get(DI_KEYS.AutomationService) as
    | AutomationService
    | undefined;
  let automationResponse: SuccessResponse | ErrorResponse;
  try {
    const automations = automationService
      ? automationService.getAutomations().map(serializeAutomation)
      : (await sprootDB.automations.getAllAsync()).map(serializeAutomation);
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
  const automationService = request.app.get(DI_KEYS.AutomationService) as
    | AutomationService
    | undefined;
  let automationResponse: SuccessResponse | ErrorResponse;
  if (
    request.params["automationId"] == null ||
    isNaN(parseInt(request.params["automationId"] as string))
  ) {
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
    const automationId = parseInt(request.params["automationId"] as string);
    const automation = automationService
      ? automationService.getAutomations().find((candidate) => candidate.id === automationId)
      : (await sprootDB.automations.getByIdAsync(automationId))[0];
    if (automation == null) {
      return {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${request.params["automationId"] as string} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    automationResponse = {
      statusCode: 200,
      content: {
        data: serializeAutomation(automation),
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
  let addAutomationResponse: SuccessResponse | ErrorResponse;

  const missingFields: Array<string> = [];
  if (request.body["name"] == null) {
    missingFields.push("Missing required field: name");
  }
  if (request.body["operator"] == null) {
    missingFields.push("Missing required field: operator");
  } else if (request.body["operator"] != "and" && request.body["operator"] != "or") {
    missingFields.push("Invalid value for operator: must be 'and' or 'or'");
  }

  if (missingFields.length > 0) {
    addAutomationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [...missingFields],
      },
      ...response.locals["defaultProperties"],
    };
    return addAutomationResponse;
  }

  try {
    const createdAutomationId = await automationService.addAutomationAsync(
      request.body["name"],
      request.body["operator"],
    );
    addAutomationResponse = {
      statusCode: 201,
      content: {
        data: {
          id: createdAutomationId,
          name: request.body["name"],
          operator: request.body["operator"],
          enabled: true,
          triggered: false,
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
  let updateAutomationResponse: SuccessResponse | ErrorResponse;
  if (
    request.params["automationId"] == null ||
    isNaN(parseInt(request.params["automationId"] as string))
  ) {
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
    const automation = (
      await sprootDB.automations.getByIdAsync(parseInt(request.params["automationId"] as string))
    )[0];
    if (automation == null) {
      updateAutomationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${request.params["automationId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return updateAutomationResponse;
    }

    automation.name = request.body["name"] ?? automation.name;
    automation.operator = request.body["operator"] ?? automation.operator;
    automation.enabled = request.body["enabled"] ?? automation.enabled;
    await automationService.updateAutomationAsync(
      parseInt(request.params["automationId"] as string),
      automation.name,
      automation.operator,
      automation.enabled,
    );
    updateAutomationResponse = {
      statusCode: 200,
      content: {
        data: {
          ...automation,
          triggered: false,
        },
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
  let deleteAutomationResponse: SuccessResponse | ErrorResponse;

  if (
    request.params["automationId"] == null ||
    isNaN(parseInt(request.params["automationId"] as string))
  ) {
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
    const automation = await sprootDB.automations.getByIdAsync(
      parseInt(request.params["automationId"] as string),
    );
    if (automation.length == 0) {
      deleteAutomationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${request.params["automationId"] as string} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return deleteAutomationResponse;
    }

    await automationService.deleteAutomationAsync(
      parseInt(request.params["automationId"] as string),
    );

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
