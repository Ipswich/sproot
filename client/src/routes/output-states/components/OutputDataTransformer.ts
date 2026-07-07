import {
  DataSeries,
  ChartSeries,
  DataPoint,
  DefaultColors,
} from "@sproot/sproot-common/src/utility/ChartData";
import { formatDateForChart } from "@sproot/sproot-common/src/utility/DisplayFormats";
import type { IOutputBase } from "@sproot/outputs/IOutputBase";
import { OutputDataQueryResponse } from "@sproot/sproot-client/src/requests/queryTypes";

export interface TransformedOutputData {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
}

export function transformOutputData(
  response: OutputDataQueryResponse,
  outputObjects: Record<number, IOutputBase>,
): TransformedOutputData {
  const { data } = response;
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
      const timeStr = formatDateForChart(value.time);
      if (!timestampMap.has(timeStr)) {
        timestampMap.set(timeStr, { name: timeStr });
      }
      const point = timestampMap.get(timeStr) as DataPoint;
      const avg = (value as Record<string, unknown>)["avg"];
      point[outputName] = typeof avg === "number" ? avg : 0;
    }
  }

  const dataSeries = Array.from(timestampMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { dataSeries, chartSeries: series };
}
