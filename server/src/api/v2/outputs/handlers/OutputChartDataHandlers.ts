import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses.js";
import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList.js";

export function outputChartDataHandler(
  request: Request,
  response: Response,
): SuccessResponse | ErrorResponse {
  const outputList = request.app.get("outputList") as OutputList;
  const chartData = outputList.chartData.get();
  if (String(request.query["latest"]).toLowerCase() == "true") {
    chartData.data = chartData.data.slice(-1);
  }

  return {
    statusCode: 200,
    content: {
      data: chartData,
    },
    ...response.locals["defaultProperties"],
  };
}
