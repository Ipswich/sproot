import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { SensorList } from "../../../../sensors/list/SensorList";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

export function sensorChartDataHandler(
  request: Request,
  response: Response,
): SuccessResponse | ErrorResponse {
  const sensorList = request.app.get(DI_KEYS.SensorList) as SensorList;
  const validatedRequest = getValidatedContractRequestData<"getSensorChartData">(response);
  const readingType = validatedRequest.query?.["readingType"];
  let getSensorChartDataResponse: SuccessResponse | ErrorResponse;
  const chartData = sensorList.chartData.get();

  //Filter out all values that aren't the requested readingType
  if (readingType !== undefined) {
    for (const chartReadingType in chartData.data) {
      if (chartReadingType !== readingType) {
        delete chartData.data[chartReadingType as ReadingType];
      }
    }
  }

  if (String(validatedRequest.query?.["latest"]).toLowerCase() == "true") {
    for (const chartReadingType in chartData.data) {
      chartData.data[chartReadingType as ReadingType] =
        chartData.data[chartReadingType as ReadingType].slice(-1);
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
