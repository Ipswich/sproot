import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { SprootDB } from "../../../../database/SprootDB";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";

/**
 * Possible statusCodes: 200, 401, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function getAsync(request: Request, response: Response) {
  const sprootDB = request.app.get("sprootDB") as SprootDB;
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
export async function getByIdAsync(request: Request, response: Response) {
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let automationResponse: SuccessResponse | ErrorResponse;
  if (request.params["automationId"] == null || isNaN(parseInt(request.params["automationId"]))) {
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
    const automation = (await sprootDB.getAutomationAsync(parseInt(request.params["automationId"])))[0];
    if (automation == null) {
      return {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${request.params["automationId"]} not found.`],
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
export async function addAsync(request: Request, response: Response) {
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
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
    const createdAutomationId = await automationDataManager.addAutomationAsync(request.body["name"], request.body["operator"]);
    addAutomationResponse = {
      statusCode: 201,
      content: {
        data: { automationId: createdAutomationId, name: request.body["name"], operator: request.body["operator"] } as SDBAutomation,
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
export async function updateAsync(request: Request, response: Response) {
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let updateAutomationResponse: SuccessResponse | ErrorResponse;
  if (request.params["automationId"] == null || isNaN(parseInt(request.params["automationId"]))) {
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
    const automation = (await sprootDB.getAutomationAsync(parseInt(request.params["automationId"])))[0];
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
    await automationDataManager.updateAutomationAsync(automation.name, automation.operator, parseInt(request.params["automationId"]));
    updateAutomationResponse = {
      statusCode: 200,
      content: {
        data: automation
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    updateAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: [error.message],
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
  const automationDatamanager = request.app.get("automationDataManager") as AutomationDataManager;
  const sprootDB = request.app.get("sprootDB") as SprootDB;
  let deleteAutomationResponse: SuccessResponse | ErrorResponse;

  if (request.params["automationId"] == null || isNaN(parseInt(request.params["automationId"]))) {
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
    const automation = await sprootDB.getAutomationAsync(parseInt(request.params["automationId"]));
    if (automation.length == 0) {
      deleteAutomationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${request.params["automationId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return deleteAutomationResponse;
    }

    await automationDatamanager.deleteAutomationAsync(parseInt(request.params["automationId"]));

    deleteAutomationResponse = {
      statusCode: 200,
      content: {
        data: "Automation deleted successfully.",
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