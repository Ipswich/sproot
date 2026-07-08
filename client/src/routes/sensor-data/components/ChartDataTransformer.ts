import {
  DataSeries,
  ChartSeries,
  DataPoint,
  DefaultColors,
} from "@sproot/sproot-common/src/utility/ChartData";
import { formatDateForChart } from "@sproot/sproot-common/src/utility/DisplayFormats";
import type { ISensorBase } from "@sproot/sensors/ISensorBase";
import type {
  Aggregate,
  SensorDataQueryResponse,
} from "../../../requests/queryTypes";

export interface TransformedSensorData {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
}

export function transformSensorData(
  response: SensorDataQueryResponse,
  sensorObjects: Record<number, ISensorBase>,
  aggregate: Aggregate = "avg",
): TransformedSensorData {
  const data = response.data;
  const xAxisValues = response.xAxis?.values ?? [];
  const series: ChartSeries[] = [];

  let colorIndex = 0;
  for (const entry of data) {
    const sensor = sensorObjects[entry.id];
    if (!sensor) continue;
    const sensorName = sensor.name;
    const color =
      sensor.color ?? DefaultColors[colorIndex % DefaultColors.length];
    series.push({ name: sensorName, color });
    colorIndex++;
  }

  const timestampMap = new Map<string, DataPoint>();

  for (const [timeIndex, timeValue] of xAxisValues.entries()) {
    const point: DataPoint = {
      name: formatDateForChart(timeValue),
    };

    for (const entry of data) {
      const sensorEntry = sensorObjects[entry.id];
      if (!sensorEntry) continue;

      const sensorName = sensorEntry.name;
      const stats = entry.statistics?.[aggregate];

      if (
        stats &&
        stats[timeIndex] !== undefined &&
        stats[timeIndex] !== null
      ) {
        point[sensorName] = stats[timeIndex];
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
