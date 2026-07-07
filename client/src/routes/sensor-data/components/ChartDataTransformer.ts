import {
  DataSeries,
  ChartSeries,
  DataPoint,
  DefaultColors,
} from "@sproot/sproot-common/src/utility/ChartData";
import { formatDateForChart } from "@sproot/sproot-common/src/utility/DisplayFormats";
import type { ISensorBase } from "@sproot/sensors/ISensorBase";
import { SensorDataQueryResponse } from "@sproot/sproot-client/src/requests/queryTypes";

export interface TransformedSensorData {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
}

export function transformSensorData(
  response: SensorDataQueryResponse,
  sensorObjects: Record<number, ISensorBase>,
): TransformedSensorData {
  const { data } = response;
  const series: ChartSeries[] = [];

  // Build chart series using full sensor objects for color
  let colorIndex = 0;
  for (const sensorId of Object.keys(data).map(Number)) {
    const sensor = sensorObjects[sensorId] as ISensorBase | undefined;
    if (!sensor) continue;
    const sensorName = sensor["name"] as string;
    const sensorColor = sensor["color"] as string;
    const color = sensorColor || DefaultColors[colorIndex % DefaultColors.length];
    series.push({ name: sensorName, color } as ChartSeries);
    colorIndex++;
  }

  // Group values by timestamp across all sensors
  const timestampMap = new Map<string, DataPoint>();

  for (const [sensorIdStr, readingGroups] of Object.entries(data)) {
    const sensorId = Number(sensorIdStr);
    const sensor = sensorObjects[sensorId] as ISensorBase | undefined;
    if (!sensor) continue;

    const sensorName = sensor["name"] as string;

    for (const [_readingType, group] of Object.entries(readingGroups as Record<string, { units: string; values: { time: string }[] }>)) {
      for (const value of group.values) {
        const timeStr = formatDateForChart(value.time);
        if (!timestampMap.has(timeStr)) {
          timestampMap.set(timeStr, { name: timeStr, units: group.units });
        }
        const point = timestampMap.get(timeStr) as DataPoint;
        const avg = (value as Record<string, unknown>)["avg"];
        point[sensorName] = typeof avg === "number" ? avg : 0;
      }
    }
  }

  const dataSeries = Array.from(timestampMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { dataSeries, chartSeries: series };
}
