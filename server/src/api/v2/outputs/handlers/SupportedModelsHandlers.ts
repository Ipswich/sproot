import { SuccessResponse } from "@sproot/api/v2/Responses";
import { ModelList } from "@sproot/sproot-common/dist/outputs/Models";
import { Response } from "express";

export function supportedModelsHandler(response: Response): SuccessResponse {
  return {
    statusCode: 200,
    content: {
      data: ModelList,
    },
    ...response.locals["defaultProperties"],
  };
}
