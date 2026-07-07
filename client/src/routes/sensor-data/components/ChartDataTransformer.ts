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
  const data = normalizeSensorResponseData(response);
  const series: ChartSeries[] = [];

  // Build chart series using full sensor objects for color
  let colorIndex = 0;
  for (const sensorId of Object.keys(data).map(Number)) {
    const sensor = sensorObjects[sensorId] as ISensorBase | undefined;
    if (!sensor) continue;
    const sensorName = sensor["name"] as string;
    const sensorColor = sensor["color"] as string;
    const color =
      sensorColor || DefaultColors[colorIndex % DefaultColors.length];
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

    for (const [_readingType, group] of Object.entries(
      readingGroups as Record<
        string,
        { units: string; values: { time: string }[] }
      >,
    )) {
      for (const value of group.values) {
        if (!timestampMap.has(value.time)) {
          timestampMap.set(value.time, {
            name: formatDateForChart(value.time),
            units: aggregate === "count" ? "" : group.units,
          });
        }
        const point = timestampMap.get(value.time) as DataPoint;
        const aggregateValue = (value as Record<string, unknown>)[aggregate];
        if (typeof aggregateValue === "number") {
          point[sensorName] = aggregateValue;
        }
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

function normalizeSensorResponseData(
  response:
    SensorDataQueryResponse | Record<string, unknown> | null | undefined,
): Record<
  number,
  Record<string, { units: string; values: { time: string }[] }>
> {
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
    if (looksLikeSensorSeriesMap(nestedRecord)) {
      return nestedRecord as Record<
        number,
        Record<string, { units: string; values: { time: string }[] }>
      >;
    }
  }

  if (looksLikeSensorSeriesMap(responseRecord)) {
    return responseRecord as Record<
      number,
      Record<string, { units: string; values: { time: string }[] }>
    >;
  }

  return {};
}

function looksLikeSensorSeriesMap(record: Record<string, unknown>): boolean {
  const firstValue = Object.values(record)[0];
  if (
    !firstValue ||
    typeof firstValue !== "object" ||
    Array.isArray(firstValue)
  ) {
    return false;
  }

  const firstReadingGroup = Object.values(
    firstValue as Record<string, unknown>,
  )[0];
  if (!firstReadingGroup || typeof firstReadingGroup !== "object") {
    return false;
  }

  return "values" in (firstReadingGroup as Record<string, unknown>);
}
