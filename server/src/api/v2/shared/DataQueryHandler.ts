import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { DI_KEYS } from "../../../utils/DependencyInjectionConstants";
import { SprootDB, InvalidCursorError } from "../../../database/SprootDB";
import { safeErrorMessage, GENERIC_ERROR_MESSAGE } from "../../../utils/errorSanitizer";
import { ValidationResultType } from "@sproot/api/v2/QueryTypes";

type ValidatorFn = (params: Record<string, unknown>, query: Record<string, unknown>) => ValidationResultType;

type QueryFn<T, R> = (db: SprootDB, params: T) => Promise<R>;

export function createDataQueryHandler<T, R extends { data: unknown; nextCursor?: string }>(
  validate: ValidatorFn,
  queryMethod: QueryFn<T, R>,
) {
  return async (request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> => {
    const sprootDB = request.app.get(DI_KEYS.SprootDB) as SprootDB;

    const query = (request.query ?? {}) as Record<string, unknown>;
    const params = (request.params ?? {}) as Record<string, unknown>;
    const validation = validate(params, query);
    if (!validation.valid) {
      return {
        statusCode: 400,
        error: {
          name: "Validation Error",
          url: request.originalUrl,
          details: validation.errors,
        },
        ...response.locals["defaultProperties"],
      };
    }

    const requestParams = validation.data as T;

    try {
      const result = await queryMethod(sprootDB, requestParams);
      const responseData: Record<string, unknown> = {
        data: result.data,
      };
      if (result["nextCursor"]) {
        responseData["nextCursor"] = result["nextCursor"];
      }
      if ((result as Record<string, unknown>)["xAxis"]) {
        (responseData as Record<string, unknown>)["xAxis"] = (result as Record<string, unknown>)[
          "xAxis"
        ];
      }
      return {
        statusCode: 200,
        content: responseData,
        ...response.locals["defaultProperties"],
      };
    } catch (error: unknown) {
      if (error instanceof InvalidCursorError) {
        return {
          statusCode: 400,
          error: {
            name: "Validation Error",
            url: request.originalUrl,
            details: [error.message],
          },
          ...response.locals["defaultProperties"],
        };
      }
      const message = safeErrorMessage(error);
      return {
        statusCode: 500,
        error: {
          name: GENERIC_ERROR_MESSAGE,
          url: request.originalUrl,
          details: [message],
        },
        ...response.locals["defaultProperties"],
      };
    }
  };
}
