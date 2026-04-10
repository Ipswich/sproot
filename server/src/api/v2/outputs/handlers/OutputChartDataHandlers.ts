import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { OutputList } from "../../../../outputs/list/OutputList";

export function outputChartDataHandler(
  request: Request,
  response: Response,
): SuccessResponse | ErrorResponse {
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
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
