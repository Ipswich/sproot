import { SuccessResponse } from "@sproot/api/v2/Responses";
import ModelList from "@sproot/sproot-common/src/outputs/ModelList";
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
