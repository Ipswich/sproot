import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";
import ModelList from "../../../../outputs/ModelList";

export async function getAvailablePinsAsync(
  request: Request,
  response: Response
): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get("outputList") as OutputList;
  let getAvailablePinsResponse: SuccessResponse | ErrorResponse;

  const errorDetails: string[] = [];
  if (request.params["model"] === undefined) {
    errorDetails.push("Model cannot be undefined.")
  }
  if (request.params["address"] === undefined) {
    errorDetails.push("Address cannot be undefined.")
  }
  if (errorDetails.length > 0) {
    getAvailablePinsResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: errorDetails
      },
      ...response.locals["defaultProperties"],
    }
    return getAvailablePinsResponse;
  }

  try {
    const models = Object.values(ModelList).map(model => model.toLowerCase())
    if (models.includes(request.params["model"]!.toLowerCase())) {
      const pins = outputList.getAvailablePins(request.params["model"]!.toLowerCase(), request.params["address"]!)
      getAvailablePinsResponse = {
        statusCode: 200,
        content: {
          data: pins
        },
        ...response.locals["defaultProperties"]
      }
    } else {
      getAvailablePinsResponse = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: request.originalUrl,
          details: [`Model '${request.params["model"]}' not recognized`]
        },
        ...response.locals["defaultProperties"],
      }
    }
  } catch (e) {
    getAvailablePinsResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [`${e}`]
      },
      ...response.locals["defaultProperties"]
    }
  }
  return getAvailablePinsResponse
}