import { ISprootDB } from "@sproot/database/ISprootDB";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { AutomationService } from "../../../../automation/AutomationService";
import { NotificationActionManager } from "../../../../automation/notifications/NotificationActionManager";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import type { operations as AutomationContractOperations } from "@sproot/sproot-common/dist/api/generated/automations/types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type ListNotificationActionsQuery =
  AutomationContractOperations["listNotificationActions"]["parameters"]["query"];
type CreateNotificationActionRequestBody =
  AutomationContractOperations["createNotificationAction"]["requestBody"]["content"]["application/json"];
type GetNotificationActionPathParams =
  AutomationContractOperations["getNotificationActionById"]["parameters"]["path"];
type DeleteNotificationActionPathParams =
  AutomationContractOperations["deleteNotificationAction"]["parameters"]["path"];

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
  const query = (getValidatedContractRequestData<"listNotificationActions">(response).query ??
    request.query) as ListNotificationActionsQuery;
  const automationId = query?.["automationId"];
  let automationResponse: SuccessResponse | ErrorResponse;

  try {
    if (automationId != null && !isNaN(parseInt(automationId))) {
      const notifications = await sprootDB.getNotificationActionsByAutomationIdAsync(
        parseInt(automationId),
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
  const pathParams = (getValidatedContractRequestData<"getNotificationActionById">(response)
    .params ?? request.params) as GetNotificationActionPathParams;
  const notificationActionIdValue = pathParams["notificationActionId"];

  if (notificationActionIdValue == null || isNaN(parseInt(String(notificationActionIdValue)))) {
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
    const notificationActionId = parseInt(String(notificationActionIdValue));
    const notification = (await sprootDB.getNotificationActionByIdAsync(notificationActionId))[0];
    if (notification == null) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Notification action with Id ${String(notificationActionIdValue)} not found.`],
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
  const requestBody = (getValidatedContractRequestData<"createNotificationAction">(response).body ??
    request.body) as CreateNotificationActionRequestBody;
  let automationResponse: SuccessResponse | ErrorResponse;

  const automationId = requestBody["automationId"];
  const subject = requestBody["subject"];
  const content = requestBody["content"];

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
  const pathParams = (getValidatedContractRequestData<"deleteNotificationAction">(response)
    .params ?? request.params) as DeleteNotificationActionPathParams;
  const notificationActionIdValue = pathParams["notificationActionId"];

  if (notificationActionIdValue == null || isNaN(parseInt(String(notificationActionIdValue)))) {
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
    const notificationActionId = parseInt(String(notificationActionIdValue));
    const notificationAction = (
      await sprootDB.getNotificationActionByIdAsync(notificationActionId)
    )[0];
    if (notificationAction == null) {
      automationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Notification action with Id ${String(notificationActionIdValue)} not found.`],
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

/**
 * Possible statusCodes: 200, 401, 503
 * @param request
 * @param response
 * @returns
 */
export async function getActiveNotificationsAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const notificationActionManager = request.app.get(
    DI_KEYS.NotificationActionManager,
  ) as NotificationActionManager;
  let automationResponse: SuccessResponse | ErrorResponse;

  try {
    const activeNotifications = notificationActionManager.activeNotifications;
    automationResponse = {
      statusCode: 200,
      content: {
        data: activeNotifications,
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
