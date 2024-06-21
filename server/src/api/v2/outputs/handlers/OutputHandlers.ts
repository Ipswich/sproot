import { OutputList } from "../../../../outputs/list/OutputList";
// import { ISprootDB } from "@sproot/database/ISprootDB";
// import { SDBOutput } from "@sproot/database/SDBOutput";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 * @returns
 */
export function getOutputHandler(
  request: Request,
  response: Response,
): SuccessResponse | ErrorResponse {
  const outputList = request.app.get("outputList") as OutputList;
  let getOutputResponse: SuccessResponse | ErrorResponse;

  if (request.params["id"] !== undefined) {
    if (outputList.outputData[request.params["id"]]) {
      getOutputResponse = {
        statusCode: 200,
        content: {
          data: [outputList.outputData[request.params["id"]]],
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      getOutputResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Output with Id ${request.params["id"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    return getOutputResponse;
  }

  getOutputResponse = {
    statusCode: 200,
    content: {
      data: Object.values(outputList.outputData),
    },
    ...response.locals["defaultProperties"],
  };
  return getOutputResponse;
}
