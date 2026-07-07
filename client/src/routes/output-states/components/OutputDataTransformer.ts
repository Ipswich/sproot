import {
  DataSeries,
  ChartSeries,
  DataPoint,
  DefaultColors,
} from "@sproot/sproot-common/src/utility/ChartData";
import { formatDateForChart } from "@sproot/sproot-common/src/utility/DisplayFormats";
import type { IOutputBase } from "@sproot/outputs/IOutputBase";
import type {
  Aggregate,
  OutputDataQueryResponse,
} from "../../../requests/queryTypes";

export interface TransformedOutputData {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
}

export function transformOutputData(
  response: OutputDataQueryResponse,
  outputObjects: Record<number, IOutputBase>,
  aggregate: Aggregate = "avg",
): TransformedOutputData {
  const data = normalizeOutputResponseData(response);
  const series: ChartSeries[] = [];

  let colorIndex = 0;
  for (const outputId of Object.keys(data).map(Number)) {
    const output = outputObjects[outputId] as IOutputBase | undefined;
    if (!output || !output["name"]) continue;
    const outputName = output["name"] as string;
    const outputColor = output["color"] as string;
    const color =
      outputColor || DefaultColors[colorIndex % DefaultColors.length];
    series.push({ name: outputName, color } as ChartSeries);
    colorIndex++;
  }

  const timestampMap = new Map<string, DataPoint>();

  for (const [outputIdStr, group] of Object.entries(data)) {
    const outputId = Number(outputIdStr);
    const output = outputObjects[outputId] as IOutputBase | undefined;
    if (!output || !output["name"]) continue;

    const outputName = output["name"] as string;

    for (const value of group.values) {
      if (!timestampMap.has(value.time)) {
        timestampMap.set(value.time, { name: formatDateForChart(value.time) });
      }
      const point = timestampMap.get(value.time) as DataPoint;
      const aggregateValue = (value as Record<string, unknown>)[aggregate];
      if (typeof aggregateValue === "number") {
        point[outputName] = aggregateValue;
      }
    }
  }

  const dataSeries = Array.from(timestampMap.entries())
    .sort(
      ([timeA], [timeB]) =>
        new Date(timeA).getTime() - new Date(timeB).getTime(),
    )
    .map(([, point]) => point);

  return { dataSeries, chartSeries: series };
}

function normalizeOutputResponseData(
  response:
    OutputDataQueryResponse | Record<string, unknown> | null | undefined,
): Record<number, { values: { time: string }[] }> {
  if (!response || typeof response !== "object") {
    return {};
  }

  const responseRecord = response as Record<string, unknown>;
  const directData = responseRecord["data"];

  if (
    directData &&
    typeof directData === "object" &&
    !Array.isArray(directData)
  ) {
    const nestedRecord = directData as Record<string, unknown>;
    if (looksLikeOutputSeriesMap(nestedRecord)) {
      return nestedRecord as Record<number, { values: { time: string }[] }>;
    }
  }

  if (looksLikeOutputSeriesMap(responseRecord)) {
    return responseRecord as Record<number, { values: { time: string }[] }>;
  }

  return {};
}

function looksLikeOutputSeriesMap(record: Record<string, unknown>): boolean {
  const firstValue = Object.values(record)[0];
  if (
    !firstValue ||
    typeof firstValue !== "object" ||
    Array.isArray(firstValue)
  ) {
    return false;
  }

  return "values" in (firstValue as Record<string, unknown>);
}
