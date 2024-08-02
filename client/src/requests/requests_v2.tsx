import { ReadingType } from "@sproot/sensors/ReadingType";
import { SuccessResponse } from "@sproot/sproot-common/src/api/v2/Responses";
import { ChartSeries, DataSeries } from "@sproot/sproot-common/src/utility/ChartData";

const SERVER_URL = import.meta.env["VITE_API_SERVER_URL"];


export async function getReadingTypesAsync(): Promise<Record<ReadingType, string>> {
  const response = await fetch(`${SERVER_URL}/api/v2/sensors/reading-types`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching reading types: ${response}`);
  }
  const deserializedResponse = await response.json() as SuccessResponse;
  return deserializedResponse.content?.data
}

export async function getSensorChartDataAsync(
  readingType?: string,
  latest?: boolean): Promise<{
    data: Partial<Record<ReadingType, DataSeries>>;
    series: ChartSeries[];
  }> {
  const queryString = queryBuilder({
    readingType,
    latest,
  });
  const response = await fetch(`${SERVER_URL}/api/v2/sensors/chart-data?${queryString}`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching reading types: ${response}`);
  }
  const deserializedResponse = await response.json() as SuccessResponse;
  return deserializedResponse.content?.data
}

export async function getOutputChartDataAsync(latest?: boolean): Promise<{
  data: DataSeries[],
  series: ChartSeries[]
}> {
  const queryString = queryBuilder({
    latest,
  });
  const response = await fetch(`${SERVER_URL}/api/v2/outputs/chart-data?${queryString}`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching reading types: ${response}`);
  }
  const deserializedResponse = await response.json() as SuccessResponse;
  return deserializedResponse.content?.data
}

function queryBuilder(params: Record<string, string | boolean | undefined>): string {
  return Object.entries(params)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}