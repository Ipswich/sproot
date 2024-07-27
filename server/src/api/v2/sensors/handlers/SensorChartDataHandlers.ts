import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { SensorList } from "../../../../sensors/list/SensorList";
import { ReadingType } from "@sproot/sensors/ReadingType";

export function sensorChartDataHandler(
  request: Request,
  response: Response,
): SuccessResponse | ErrorResponse {
  const sensorList = request.app.get("sensorList") as SensorList;
  let getSensorChartDataResponse: SuccessResponse | ErrorResponse;
  const chartData = sensorList.chartData.get();

  //Filter out all values that aren't the requested readingType
  if (request.query["readingType"] !== undefined) {
    for (const readingType in chartData.data) {
      if (readingType !== request.query["readingType"]) {
        delete chartData.data[readingType as ReadingType];
      }
    }
  }

  if (String(request.query["latest"]).toLowerCase() == "true") {
    for (const readingType in chartData.data) {
      chartData.data[readingType as ReadingType] =
        chartData.data[readingType as ReadingType].slice(-1);
    }
  }

  getSensorChartDataResponse = {
    statusCode: 200,
    content: {
      data: chartData,
    },
    ...response.locals["defaultProperties"],
  };
  return getSensorChartDataResponse;
}
