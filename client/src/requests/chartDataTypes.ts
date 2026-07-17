import {
  convertCelsiusToFahrenheit,
  formatDateForDisplay,
} from "@sproot/sproot-common/src/utility/DisplayFormats";
import { Units } from "@sproot/sproot-common/src/sensors/ReadingType";
import { getDownsampleMinutes } from "./queryTypes";

export type DataPoint = {
  name: string;
  rawTimestamp?: string;
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

export function getEffectiveEndDate(selectedEnd: Date): Date {
  const selectedDayStart = new Date(
    selectedEnd.getFullYear(),
    selectedEnd.getMonth(),
    selectedEnd.getDate(),
  );

  return new Date(selectedDayStart.getTime() + 86399999);
}

export function getEffectiveDisplayEndDate(selectedEnd: Date): Date {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDayStart = new Date(
    selectedEnd.getFullYear(),
    selectedEnd.getMonth(),
    selectedEnd.getDate(),
  );

  if (selectedDayStart.getTime() === todayStart.getTime()) {
    return now;
  }

  return new Date(selectedDayStart.getTime() + 86399999);
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
    const date = new Date(current);
    timeline.push({
      name: formatDateForDisplay(date),
      rawTimestamp: date.toISOString(),
    });
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
  if (!useFahrenheit) {
    return dataSeries.map((dataPoint) => ({
      ...dataPoint,
      units: Units.temperature,
    }));
  }

  return dataSeries.map((dataPoint) => {
    const convertedPoint: DataPoint = { ...dataPoint };
    convertedPoint.units = "\u00b0F";

    for (const [key, value] of Object.entries(dataPoint)) {
      if (key === "name" || key === "units" || typeof value !== "number") {
        continue;
      }

      convertedPoint[key] = convertCelsiusToFahrenheit(value) ?? value;
    }

    return convertedPoint;
  });
}
