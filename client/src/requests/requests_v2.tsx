import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { ISensorBase } from "@sproot/sensors/ISensorBase";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { SuccessResponse } from "@sproot/sproot-common/src/api/v2/Responses";
import {
  ChartSeries,
  DataSeries,
} from "@sproot/sproot-common/src/utility/ChartData";

const SERVER_URL = import.meta.env["VITE_API_SERVER_URL"];

export async function getReadingTypesAsync(): Promise<
  Record<ReadingType, string>
> {
  const response = await fetch(`${SERVER_URL}/api/v2/sensors/reading-types`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching reading types: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getSensorChartDataAsync(
  readingType?: string,
  latest?: boolean,
): Promise<{
  data: Partial<Record<ReadingType, DataSeries>>;
  series: ChartSeries[];
}> {
  const queryString = queryBuilder({
    readingType,
    latest,
  });
  const response = await fetch(
    `${SERVER_URL}/api/v2/sensors/chart-data?${queryString}`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching sensor chart data: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getOutputChartDataAsync(latest?: boolean): Promise<{
  data: DataSeries;
  series: ChartSeries[];
}> {
  const queryString = queryBuilder({
    latest,
  });
  const response = await fetch(
    `${SERVER_URL}/api/v2/outputs/chart-data?${queryString}`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching output chart data: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getSensorsAsync(): Promise<Record<string, ISensorBase>> {
  const response = await fetch(`${SERVER_URL}/api/v2/sensors`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching sensors: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getOutputsAsync(): Promise<Record<string, IOutputBase>> {
  const response = await fetch(`${SERVER_URL}/api/v2/outputs`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching outputs: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function setOutputControlModeAsync(
  id: number,
  controlMode: string = "manual",
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/outputs/${id}/control-mode`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ controlMode }),
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error setting control mode: ${response}`);
  }
}

export async function setOutputManualStateAsync(
  id: number,
  value: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/outputs/${id}/manual-state`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error setting manual state: ${response}`);
  }
}

function queryBuilder(
  params: Record<string, string | boolean | undefined>,
): string {
  return (
    Object.entries(params)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join("&")
  );
}
