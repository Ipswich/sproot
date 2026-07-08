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
  const data = response.data;
  const xAxisValues = response.xAxis?.values ?? [];
  const series: ChartSeries[] = [];

  let colorIndex = 0;
  for (const entry of data) {
    const output = outputObjects[entry.id];
    if (!output?.name) continue;
    const outputName = output.name;
    const outputColor = output.color;
    const color =
      outputColor ?? DefaultColors[colorIndex % DefaultColors.length];
    series.push({ name: outputName, color });
    colorIndex++;
  }

  const timestampMap = new Map<string, DataPoint>();

  for (const [timeIndex, timeValue] of xAxisValues.entries()) {
    const point: DataPoint = {
      name: formatDateForChart(timeValue),
    };

    for (const entry of data) {
      const outputEntry = outputObjects[entry.id];
      if (!outputEntry?.name) continue;

      const outputName = outputEntry.name;
      const stats = entry.statistics?.[aggregate];

      if (
        stats &&
        stats[timeIndex] !== undefined &&
        stats[timeIndex] !== null
      ) {
        point[outputName] = stats[timeIndex];
        if (!point.units) {
          point.units = aggregate === "count" ? "" : entry.units;
        }
      }
    }

    const hasValue = Object.keys(point).some(
      (key) => key !== "name" && key !== "units" && point[key] !== undefined,
    );
    if (hasValue) {
      timestampMap.set(timeValue, point);
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
