import {
  convertCelsiusToFahrenheit,
  convertFahrenheitToCelsius,
  formatDateForChart,
} from "@sproot/sproot-common/src/utility/DisplayFormats";
import { Units } from "@sproot/sproot-common/src/sensors/ReadingType";
import { getDownsampleMinutes } from "./queryTypes";

export type DataPoint = {
  name: string;
  units?: string;
  [key: string]: number | string | undefined;
};

export type DataSeries = DataPoint[];

export type ChartSeries = {
  name: string;
  color: string;
};

export function getChartIntervalMs(chartInterval: string): number {
  const hours = chartInterval === "0" ? 168 : parseInt(chartInterval, 10) || 24;
  return hours * 60 * 60 * 1000;
}

export function scalePercentile(value: number): number {
  return Math.min(1, Math.max(0, value / 100));
}

export function buildChartTimeline(
  start: Date,
  end: Date,
  downsample: string,
): DataSeries {
  const intervalMs = getDownsampleMinutes(downsample) * 60 * 1000;
  const firstBucket = Math.ceil(start.getTime() / intervalMs) * intervalMs;
  const lastBucket = Math.floor(end.getTime() / intervalMs) * intervalMs;

  if (firstBucket > lastBucket) {
    return [];
  }

  const timeline: DataSeries = [];
  for (
    let current = firstBucket;
    current <= lastBucket;
    current += intervalMs
  ) {
    timeline.push({ name: formatDateForChart(new Date(current)) });
  }

  return timeline;
}

export function mergeDataIntoTimeline(
  timeline: DataSeries,
  values: DataSeries,
): DataSeries {
  if (timeline.length === 0) {
    return values;
  }

  const valuesByName = new Map(
    values.map((dataPoint) => [dataPoint.name, dataPoint]),
  );
  return timeline.map((timelinePoint) => ({
    ...timelinePoint,
    ...(valuesByName.get(timelinePoint.name) ?? {}),
  }));
}

export function convertTemperatureSeries(
  dataSeries: DataSeries,
  useFahrenheit: boolean,
): DataSeries {
  return dataSeries.map((dataPoint) => {
    const convertedPoint: DataPoint = { ...dataPoint };
    const targetUnits = useFahrenheit ? "\u00b0F" : Units.temperature;
    convertedPoint.units = targetUnits;

    for (const [key, value] of Object.entries(dataPoint)) {
      if (key === "name" || key === "units" || typeof value !== "number") {
        continue;
      }

      convertedPoint[key] = useFahrenheit
        ? (convertCelsiusToFahrenheit(value) ?? value)
        : (convertFahrenheitToCelsius(value) ?? value);
    }

    return convertedPoint;
  });
}
