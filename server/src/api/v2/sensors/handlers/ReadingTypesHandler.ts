import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { SensorList } from "../../../../sensors/list/SensorList";
import { ReadingType } from "@sproot/sensors/ReadingType";

export function readingTypesHandler(
  request: Request,
  response: Response,
): SuccessResponse | ErrorResponse {
  const sensorList = request.app.get("sensorList") as SensorList;
  const readingTypes: Partial<Record<ReadingType, string>> = {} as Partial<
    Record<ReadingType, string>
  >;
  Object.values(sensorList.sensors).forEach((sensor) => {
    for (const readingType in sensor.units) {
      readingTypes[readingType as ReadingType] = sensor.units[readingType as ReadingType];
    }
  });

  const getReadingTypesResponse = {
    statusCode: 200,
    content: {
      data: readingTypes,
    },
    ...response.locals["defaultProperties"],
  };
  return getReadingTypesResponse;
}
