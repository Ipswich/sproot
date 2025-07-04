import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";
import ModelList from "@sproot/sproot-common/src/outputs/ModelList";

export async function getAvailableDevices(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get("outputList") as OutputList;
  let getAvailableIdentifiersResponse: SuccessResponse | ErrorResponse;

  const errorDetails: string[] = [];
  if (request.params["model"] === undefined) {
    errorDetails.push("Model cannot be undefined.");
  }
  if (errorDetails.length > 0) {
    getAvailableIdentifiersResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: errorDetails,
      },
      ...response.locals["defaultProperties"],
    };
    return getAvailableIdentifiersResponse;
  }

  try {
    const models = Object.values(ModelList).map((model) => model.toLowerCase());
    if (models.includes(request.params["model"]!.toLowerCase())) {
      const pins = outputList.getAvailableDevices(
        request.params["model"]!.toLowerCase(),
        request.query["address"] as string,
        request.query["filterUsed"] as boolean | undefined,
      );
      getAvailableIdentifiersResponse = {
        statusCode: 200,
        content: {
          data: pins,
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      getAvailableIdentifiersResponse = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: request.originalUrl,
          details: [`Model '${request.params["model"]}' not recognized`],
        },
        ...response.locals["defaultProperties"],
      };
    }
  } catch (e) {
    getAvailableIdentifiersResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [`${e}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return getAvailableIdentifiersResponse;
}
