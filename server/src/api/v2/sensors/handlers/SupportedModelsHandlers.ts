import { SuccessResponse } from "@sproot/api/v2/Responses";
import ModelList from "../../../../sensors/ModelList";
import { Response } from "express";

export function supportedModelsHandler(response: Response): SuccessResponse {
  return {
    statusCode: 200,
    content: {
      data: Object.values(ModelList),
    },
    ...response.locals["defaultProperties"],
  };
}
