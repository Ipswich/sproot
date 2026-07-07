import * as Constants from "@sproot/sproot-common/src/utility/Constants";
import {
  ChartData,
  DataSeries,
} from "@sproot/sproot-common/src/utility/ChartData";
import {
  ReadingType,
  Units,
} from "@sproot/sproot-common/src/sensors/ReadingType";
import type { ISensorBase } from "@sproot/sensors/ISensorBase";
import {
  getQueryPointLimit,
  getChartIntervalHours,
  getDownsampleMinutes,
  resolveSelectedDownsample,
  type Aggregate,
  type SensorDataQueryRequest,
} from "../../../requests/queryTypes";
import { useMemo } from "react";
import {
  getSensorsAsync,
  fetchSensorDataAsync,
} from "../../../requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import ReadingsChart from "./ReadingsChart";
import { transformSensorData } from "./ChartDataTransformer";
import {
  convertCelsiusToFahrenheit,
  convertFahrenheitToCelsius,
} from "@sproot/sproot-common/src/utility/DisplayFormats";

export interface ReadingsChartContainerProps {
  readingType: string;
  chartInterval: string;
  toggledSensors: string[];
  toggledDeviceZones: string[];
  useAlternateUnits: boolean;
  customTimeRange?: { start: Date; end: Date } | null;
  aggregate: Aggregate;
  downsampleSelection: string;
  percentile: number;
}

export default function ReadingsChartContainer({
  readingType,
  chartInterval,
  toggledSensors,
  toggledDeviceZones,
  useAlternateUnits,
  customTimeRange,
  aggregate,
  downsampleSelection,
  percentile,
}: ReadingsChartContainerProps) {
  const sensorsQuery = useQuery({
    queryKey: ["sensor-data-sensors"],
    queryFn: () => getSensorsAsync(),
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const timeRange = useMemo(() => {
    if (customTimeRange) {
      return {
        start: customTimeRange.start.toISOString(),
        end: customTimeRange.end.toISOString(),
      };
    }

    const end = new Date();
    const start = new Date(
      end.getTime() -
        Constants.MAX_CHART_DATA_POINTS *
          Constants.CHART_DATA_POINT_INTERVAL *
          60 *
          1000,
    );

    return { start: start.toISOString(), end: end.toISOString() };
  }, [customTimeRange]);

  const durationMs = useMemo(() => {
    return (
      new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime()
    );
  }, [timeRange.end, timeRange.start]);

  const downsample = useMemo(() => {
    return resolveSelectedDownsample(
      downsampleSelection,
      durationMs,
      !customTimeRange,
    );
  }, [customTimeRange, downsampleSelection, durationMs]);

  const queryLimit = useMemo(() => {
    return getQueryPointLimit(durationMs, downsample);
  }, [downsample, durationMs]);

  const chartDataQuery = useQuery({
    queryKey: [
      "sensor-data-chart",
      readingType,
      timeRange.start,
      timeRange.end,
      downsample,
      aggregate,
      percentile,
    ],
    queryFn: async () => {
      const request: SensorDataQueryRequest = {
        timeRange,
        readingTypes: [readingType],
        downsample,
        limit: queryLimit,
        aggregates: [aggregate],
      };
      if (aggregate === "percentile") {
        request.percentile = percentile;
      }
      return fetchSensorDataAsync(request);
    },
    refetchInterval: 300000,
    enabled: !!sensorsQuery.data,
    placeholderData: (previousData) => previousData,
  });

  const sensorObjects = useMemo(() => {
    if (!sensorsQuery.data) return {};
    const result: Record<number, ISensorBase> = {};
    for (const key of Object.keys(sensorsQuery.data)) {
      const sensor = sensorsQuery.data[key]!;
      result[sensor.id] = sensor;
    }
    return result;
  }, [sensorsQuery.data]);

  const transformedData = useMemo(() => {
    if (!chartDataQuery.data) return null;
    return transformSensorData(chartDataQuery.data, sensorObjects, aggregate);
  }, [aggregate, chartDataQuery.data, sensorObjects]);

  const displayDataSeries = useMemo(() => {
    if (!transformedData) {
      return [];
    }

    const intervalMinutes = getDownsampleMinutes(downsample);
    const end = new Date(timeRange.end);
    const baseSeries = new ChartData(
      Math.max(1, Math.ceil(durationMs / (intervalMinutes * 60 * 1000))),
      intervalMinutes,
      undefined,
      end,
    ).get();

    const valuesByTime = new Map(
      transformedData.dataSeries.map((dataPoint) => [
        dataPoint.name,
        dataPoint,
      ]),
    );

    return baseSeries.map((dataPoint) => ({
      ...dataPoint,
      ...(valuesByTime.get(dataPoint.name) ?? {}),
    }));
  }, [downsample, durationMs, timeRange.end, transformedData]);

  const timeSpans = useMemo(() => {
    return ChartData.generateTimeSpansFromDataSeries(
      displayDataSeries,
      getDownsampleMinutes(downsample),
    );
  }, [displayDataSeries, downsample]);

  const activeDataSeries = useMemo(() => {
    if (customTimeRange) {
      return displayDataSeries;
    }

    return timeSpans[getChartIntervalHours(chartInterval)] ?? [];
  }, [chartInterval, customTimeRange, displayDataSeries, timeSpans]);

  const chartDataForRender = useMemo(() => {
    if (readingType !== ReadingType.temperature) {
      return activeDataSeries.map((dataPoint) => ({ ...dataPoint }));
    }

    const clonedData = activeDataSeries.map((dataPoint) => ({ ...dataPoint }));
    convertTemperatureUnits(clonedData, useAlternateUnits);
    return clonedData;
  }, [activeDataSeries, readingType, useAlternateUnits]);

  // Build hidden sensor list
  const hiddenSensorsFromDeviceZones = Object.values(sensorsQuery.data ?? {})
    .filter((sensor: any) => {
      return (
        toggledDeviceZones.includes((sensor.deviceZoneId ?? -1).toString()) ||
        !Object.keys(sensor.lastReading).includes(readingType)
      );
    })
    .map((sensor: any) => sensor.name);

  const hiddenSensors =
    hiddenSensorsFromDeviceZones.length ===
    Object.values(sensorsQuery.data ?? {}).length
      ? []
      : toggledSensors.concat(hiddenSensorsFromDeviceZones);

  const filteredData = ChartData.filterChartData(
    chartDataForRender,
    hiddenSensors,
  );
  const hasVisibleValues = filteredData.some((dataPoint) =>
    Object.keys(dataPoint).some((key) => key !== "name" && key !== "units"),
  );

  return (
    <ReadingsChart
      dataSeries={filteredData}
      chartSeries={transformedData?.chartSeries ?? []}
      readingType={readingType}
      chartRendering={chartDataQuery.isPending && !chartDataQuery.data}
      showEmptyState={!hasVisibleValues}
    />
  );
}

function convertTemperatureUnits(
  dataSeries: DataSeries,
  useFahrenheit: boolean,
) {
  for (const dataPoint of dataSeries) {
    if (useFahrenheit) {
      if (dataPoint.units === "\u00b0F") continue;
      dataPoint.units = "\u00b0F";
      for (const key of Object.keys(dataPoint)) {
        if (key === "units" || key === "name") continue;
        const val = dataPoint[key];
        if (typeof val === "number") {
          dataPoint[key] = convertCelsiusToFahrenheit(val)!;
        }
      }
    } else {
      if (dataPoint.units === Units.temperature) continue;
      dataPoint.units = Units.temperature;
      for (const key of Object.keys(dataPoint)) {
        if (key === "units" || key === "name") continue;
        const val = dataPoint[key];
        if (typeof val === "number") {
          dataPoint[key] = convertFahrenheitToCelsius(val)!;
        }
      }
    }
  }
}
