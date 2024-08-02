import { ReadingType } from "@sproot/sensors/ReadingType";
import { getReadingTypesAsync, getSensorChartDataAsync, getOutputChartDataAsync } from "../../requests/requests_v2";
import { Params } from "react-router-dom";

export async function rootLoader(): Promise<Partial<Record<ReadingType, string>>> {
  const data = await getReadingTypesAsync();
  return data;
}

export async function sensorChartDataLoader({ params } : { params: Params<"readingType"> }) {
  const data = await getSensorChartDataAsync(params.readingType as string);
  return data;
}

export async function outputChartDataLoader() {
  const data = await getOutputChartDataAsync();
  return data;
}