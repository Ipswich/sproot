import { ChartData, DataSeries } from "@sproot/sproot-common/src/utility/ChartData";
import {
  ReadingType,
  Units,
} from "@sproot/sproot-common/src/sensors/ReadingType";
import type { ISensorBase } from "@sproot/sensors/ISensorBase";
import type { SensorDataQueryRequest } from "@sproot/requests/queryTypes";
import { useMemo, useState } from "react";
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
  chartRendering: boolean;
  setChartRendering: (value: boolean) => void;
  useAlternateUnits: boolean;
  customTimeRange?: { start: Date; end: Date } | null;
}

export default function ReadingsChartContainer({
  readingType,
  chartInterval,
  toggledSensors,
  toggledDeviceZones,
  chartRendering,
  setChartRendering,
  useAlternateUnits,
  customTimeRange,
}: ReadingsChartContainerProps) {
  const [isFetching, setIsFetching] = useState(false);

  const sensorsQuery = useQuery({
    queryKey: ["sensor-data-sensors"],
    queryFn: () => getSensorsAsync(),
    refetchInterval: 60000,
  });

  const timeRange = useMemo(() => {
    if (customTimeRange) {
      return {
        start: customTimeRange.start.toISOString(),
        end: customTimeRange.end.toISOString(),
      };
    }
    const hours = parseInt(chartInterval) || 24;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [customTimeRange, chartInterval]);

  const downsample = useMemo(() => {
    if (customTimeRange) {
      const durationMs = customTimeRange.end.getTime() - customTimeRange.start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      if (durationHours <= 72) return "5m";
      if (durationHours <= 168) return "1h";
      return "1d";
    }
    const hours = parseInt(chartInterval) || 24;
    if (hours <= 72) return "5m";
    return "1h";
  }, [customTimeRange, chartInterval]);

  const chartDataQuery = useQuery({
    queryKey: ["sensor-data-chart", readingType, timeRange.start, timeRange.end, downsample],
    queryFn: async () => {
      setIsFetching(true);
      const request: SensorDataQueryRequest = {
        timeRange,
        readingTypes: [readingType],
        downsample,
        limit: 2000,
        aggregates: ["avg", "min", "max"],
      };
      const response = await fetchSensorDataAsync(request);
      setChartRendering(false);
      setIsFetching(false);
      return response;
    },
    refetchInterval: 300000,
    enabled: !!sensorsQuery.data,
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
    return transformSensorData(chartDataQuery.data, sensorObjects);
  }, [chartDataQuery.data, sensorObjects]);

  // Temperature unit conversion
  if (readingType === ReadingType.temperature && chartInterval !== "0" && transformedData) {
    convertTemperatureUnits(transformedData.dataSeries, useAlternateUnits);
  }

  // Build hidden sensor list
  const hiddenSensorsFromDeviceZones = (
    Object.values(sensorsQuery.data ?? {})
  )
    .filter((sensor: any) => {
      return (
        toggledDeviceZones.includes((sensor.deviceZoneId ?? -1).toString()) ||
        !Object.keys(sensor.lastReading).includes(readingType)
      );
    })
    .map((sensor: any) => sensor.name);

  const hiddenSensors =
    hiddenSensorsFromDeviceZones.length === Object.values(sensorsQuery.data ?? {}).length
      ? []
      : toggledSensors.concat(hiddenSensorsFromDeviceZones);

  const filteredData = transformedData
    ? ChartData.filterChartData(transformedData.dataSeries, hiddenSensors)
    : [];

  return (
    <ReadingsChart
      dataSeries={filteredData}
      chartSeries={transformedData?.chartSeries ?? []}
      readingType={readingType}
      chartRendering={isFetching || chartDataQuery.isPending || chartRendering}
      showEmptyState={filteredData.length === 0}
    />
  );
}

function convertTemperatureUnits(dataSeries: DataSeries, useFahrenheit: boolean) {
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
