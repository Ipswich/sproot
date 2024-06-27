import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";

export function outputChartDataHandler(request: Request, response: Response): SuccessResponse | ErrorResponse {
  const outputList = request.app.get("outputList") as OutputList;
  let getOutputResponse: SuccessResponse | ErrorResponse;

  const chartData = outputList.chartData.get();
  if (String(request.query["latest"]).toLowerCase() == "true") {
    chartData.data = chartData.data.slice(-1);
  }

  getOutputResponse = {
    statusCode: 200,
    content: {
      data: chartData,
    },
    ...response.locals["defaultProperties"],
  };
  return getOutputResponse;
};