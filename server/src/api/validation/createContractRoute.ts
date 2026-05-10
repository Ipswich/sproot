import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { ContractOperationId } from "@sproot/sproot-common/dist/api/contracts/operation-types";

import { getOperationContract } from "./operationRegistry";
import {
  setValidatedContractRequestData,
  validateRequestAgainstContract,
} from "./validateRequest";
import { validateResponseAgainstContract } from "./validateResponse";

export type ContractRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => void | Promise<void>;

export type CreateContractRouteOptions = {
  validateRequest?: boolean;
  validateResponse?: boolean;
};

export default function createContractRoute(
  operationId: ContractOperationId,
  handler: ContractRouteHandler,
  options: CreateContractRouteOptions = {}
): RequestHandler {
  const contract = getOperationContract(operationId);
  const shouldValidateRequest = options.validateRequest ?? true;
  const shouldValidateResponse = options.validateResponse ?? true;

  return async (request: Request, response: Response, next: NextFunction) => {
    const originalJson = response.json.bind(response);

    if (shouldValidateResponse) {
      response.json = ((body: unknown) => {
        validateResponseAgainstContract(contract, body, response.statusCode);
        return originalJson(body);
      }) as Response["json"];
    }

    try {
      if (shouldValidateRequest) {
        const validatedRequestData = validateRequestAgainstContract(contract, request);
        setValidatedContractRequestData(response, validatedRequestData);
      }

      await handler(request, response, next);
    } catch (error) {
      next(error);
    } finally {
      response.json = originalJson as Response["json"];
    }
  };
}
