import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { ContractOperationId } from "@sproot/sproot-common/dist/api/contracts/operation-types";

import { getOperationContract } from "./operationRegistry";
import { validateRequestAgainstContract } from "./validateRequest";
import { validateResponseAgainstContract } from "./validateResponse";

export type ContractRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => void | Promise<void>;

export type CreateContractRouteOptions = {
  validateRequest?: boolean;
  validateResponse?: boolean;
};

export default function createContractRoute(
  operationId: ContractOperationId,
  handler: ContractRouteHandler,
  options: CreateContractRouteOptions = {},
): RequestHandler {
  const contract = getOperationContract(operationId);
  const shouldValidateRequest = options.validateRequest ?? true;
  const shouldValidateResponse = options.validateResponse ?? true;

  return async (request: Request, response: Response, next: NextFunction) => {
    const originalJson = response.json.bind(response);
    const shouldDebugChartRoute =
      process.env["NODE_ENV"] === "test" && operationId === "getOutputChartData";

    if (shouldValidateResponse) {
      response.json = ((body: unknown) => {
        try {
          validateResponseAgainstContract(contract, body, response.statusCode);
        } catch (error) {
          if (shouldDebugChartRoute) {
            console.error(
              "[chart-debug] response validation threw",
              JSON.stringify({
                operationId,
                statusCode: response.statusCode,
                body,
                error:
                  error instanceof Error
                    ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                      }
                    : error,
              }),
            );
          }
          throw error;
        }
        return originalJson(body);
      }) as Response["json"];
    }

    try {
      if (shouldValidateRequest) {
        validateRequestAgainstContract(contract, request);
      }

      await handler(request, response, next);
    } catch (error) {
      if (shouldDebugChartRoute) {
        console.error(
          "[chart-debug] route handler threw",
          JSON.stringify({
            operationId,
            method: request.method,
            url: request.originalUrl,
            error:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : error,
          }),
        );
      }
      next(error);
    } finally {
      response.json = originalJson as Response["json"];
    }
  };
}
