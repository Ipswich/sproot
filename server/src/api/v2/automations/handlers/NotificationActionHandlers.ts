import { ISprootDB } from "@sproot/database/ISprootDB";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { AutomationService } from "../../../../automation/AutomationService";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request
 * @param response
 */
export async function getAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  let automationResponse: SuccessResponse | ErrorResponse;

  try {
    if (
      request.query["automationId"] != null &&
      !isNaN(parseInt(request.query["automationId"] as string))
    ) {
      const notifications = await sprootDB.getNotificationActionsByAutomationIdAsync(
        parseInt(request.query["automationId"] as string),
      );
      automationResponse = {
        statusCode: 200,
        content: {
          data: notifications,
        },
        ...response.locals["defaultProperties"],
      };
      return automationResponse;
    }

    const notifications = await sprootDB.getNotificationActionsAsync();
    automationResponse = {
      statusCode: 200,
      content: {
        data: notifications,
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
    request.params["notificationActionId"] == null ||
    isNaN(parseInt(request.params["notificationActionId"]))
  ) {
    automationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing notification action Id."],
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }

  try {
    const notificationActionId = parseInt(request.params["notificationActionId"] ?? "");
    const notification = (await sprootDB.getNotificationActionByIdAsync(notificationActionId))[0];
    if (notification == null) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [
            `Notification action with Id ${request.params["notificationActionId"]} not found.`,
          ],
        },
        ...response.locals["defaultProperties"],
      };
      return automationResponse;
    }

    automationResponse = {
      statusCode: 200,
      content: {
        data: notification,
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
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const automationService = request.app.get(DI_KEYS.AutomationService) as AutomationService;
  let automationResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.body["automationId"] ?? "");
  const subject = request.body["subject"] ?? "";
  const content = request.body["content"] ?? "";

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
  }
  if (subject == null || subject.trim() === "") {
    invalidFields.push("Subject is required.");
  }
  if (content == null || content.trim() === "") {
    invalidFields.push("Content is required.");
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

    const notificationActionId = await automationService.addNotificationActionAsync(
      automationId,
      subject,
      content,
    );
    automationResponse = {
      statusCode: 201,
      content: {
        data: {
          id: notificationActionId,
          automationId: automationId,
          subject: subject,
          content: content,
        },
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
    request.params["notificationActionId"] == null ||
    isNaN(parseInt(request.params["notificationActionId"]))
  ) {
    automationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing notification action Id."],
      },
      ...response.locals["defaultProperties"],
    };
    return automationResponse;
  }

  try {
    const notificationActionId = parseInt(request.params["notificationActionId"] ?? "");
    const notificationAction = (
      await sprootDB.getNotificationActionByIdAsync(notificationActionId)
    )[0];
    if (notificationAction == null) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [
            `Notification action with Id ${request.params["notificationActionId"]} not found.`,
          ],
        },
        ...response.locals["defaultProperties"],
      };
      return automationResponse;
    }

    await automationService.deleteNotificationActionAsync(notificationActionId);
    automationResponse = {
      statusCode: 200,
      content: {
        data: "Notification action deleted successfully.",
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
