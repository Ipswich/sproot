import { SuccessResponse } from "@sproot/api/v2/Responses";
import ModelList from "@sproot/sproot-common/dist/sensors/ModelList";
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
