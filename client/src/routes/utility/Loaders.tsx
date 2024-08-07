import { ReadingType } from "@sproot/sensors/ReadingType";
import { getReadingTypesAsync } from "../../requests/requests_v2";
import { Params } from "react-router-dom";

export async function rootLoader(): Promise<Partial<Record<ReadingType, string>>> {
  const data = await getReadingTypesAsync();
  return data;
}

export async function sensorChartDataLoader({ params } : { params: Params<"readingType"> }) {
  return params.readingType;
}