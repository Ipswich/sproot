import { useQuery } from "@tanstack/react-query";
import { Box, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  fetchSensorDataAsync,
  getSensorsAsync,
} from "../../../requests/requests_v2";
import {
  getQueryPointLimit,
  resolveSelectedDownsample,
  type Aggregate,
  type SensorDataQueryRequest,
} from "../../../requests/queryTypes";
import {
  buildChartTimeline,
  convertTemperatureSeries,
  getChartIntervalMs,
  mergeDataIntoTimeline,
  scalePercentile,
} from "../../../requests/chartDataTypes";
import { fetchPaginatedChartData } from "../../../requests/chartDataPagination";
import { ReadingsChartTransformer } from "./ReadingsChartTransformer";
import ReadingsChart from "./ReadingsChart";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";

interface ReadingsChartContainerProps {
  readingType: string;
  chartInterval: string;
  toggledSensors: string[];
  toggledDeviceZones: string[];
  useAlternateUnits: boolean;
  customTimeRange?: { start: Date; end: Date } | null;
  aggregate: Aggregate;
  downsampleSelection: string;
  percentile?: number;
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
  const [showReferenceLines, setShowReferenceLines] = useState(true);

  const sensorsQuery = useQuery({
    queryKey: ["sensors", readingType],
    queryFn: async () => {
      const allSensors = await getSensorsAsync();
      return Object.values(allSensors).filter(
        (sensor: ISensorBase) =>
          sensor.lastReading &&
          readingType in sensor.lastReading &&
          sensor.lastReading[readingType as ReadingType] != null,
      );
    },
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const timeRange = useMemo(() => {
    if (customTimeRange) {
      return [customTimeRange.start, customTimeRange.end] as [Date, Date];
    }

    const end = new Date();
    const start = new Date(end.getTime() - getChartIntervalMs(chartInterval));
    return [start, end] as [Date, Date];
  }, [chartInterval, customTimeRange]);

  const durationMs = timeRange[1].getTime() - timeRange[0].getTime();
  const downsample = resolveSelectedDownsample(downsampleSelection, durationMs);
  const queryLimit = getQueryPointLimit(durationMs, downsample);

  const sensors = useMemo(() => sensorsQuery.data ?? [], [sensorsQuery.data]);
  const visibleSensors = useMemo(
    () =>
      sensors.filter((sensor) => {
        const deviceZoneId = sensor.deviceZoneId ?? -1;
        return (
          !toggledDeviceZones.includes(String(deviceZoneId)) &&
          !toggledSensors.includes(String(sensor.id)) &&
          !toggledSensors.includes(sensor.name)
        );
      }),
    [sensors, toggledDeviceZones, toggledSensors],
  );
  const ids = visibleSensors.map((sensor) => sensor.id);

  const dataQuery = useQuery({
    queryKey: [
      "sensorData",
      readingType,
      timeRange[0].toISOString(),
      timeRange[1].toISOString(),
      downsample,
      aggregate,
      percentile,
      ...ids,
    ],
    queryFn: async () => {
      const request: SensorDataQueryRequest = {
        timeRange: {
          start: timeRange[0].toISOString(),
          end: timeRange[1].toISOString(),
        },
        readingTypes: [readingType],
        downsample,
        limit: queryLimit,
        aggregates: [aggregate],
        ids,
        ...(percentile !== undefined && {
          percentile: scalePercentile(percentile),
        }),
      };
      return fetchPaginatedChartData(fetchSensorDataAsync, request);
    },
    enabled: sensorsQuery.isSuccess && ids.length > 0,
    refetchInterval: 300000,
    placeholderData: (previousData) => previousData,
  });

  const transformed = useMemo(
    () =>
      dataQuery.data?.data
        ? ReadingsChartTransformer.transform(
            dataQuery.data.data,
            visibleSensors,
            aggregate,
          )
        : null,
    [aggregate, dataQuery.data?.data, visibleSensors],
  );

  const displayDataSeries = useMemo(() => {
    if (!transformed) {
      return [];
    }

    const mergedDataSeries = mergeDataIntoTimeline(
      buildChartTimeline(timeRange[0], timeRange[1], downsample),
      transformed.dataSeries,
    );

    if (readingType !== ReadingType.temperature) {
      return mergedDataSeries;
    }

    return convertTemperatureSeries(mergedDataSeries, useAlternateUnits);
  }, [downsample, readingType, timeRange, transformed, useAlternateUnits]);

  const hasVisibleValues = displayDataSeries.some((dataPoint) =>
    Object.keys(dataPoint).some(
      (key) =>
        key !== "name" && key !== "units" && dataPoint[key] !== undefined,
    ),
  );

  const isInitialLoading =
    sensorsQuery.isLoading || (dataQuery.isLoading && !dataQuery.data);

  if (dataQuery.error) {
    return (
      <Box>
        <Text c="red">
          Error loading chart data: {(dataQuery.error as Error).message}
        </Text>
      </Box>
    );
  }

  if (dataQuery.data?.error) {
    return (
      <Box>
        <Text c="yellow.7">
          Unable to fetch all data. Showing partial results.
        </Text>
      </Box>
    );
  }

  return (
    <ReadingsChart
      dataSeries={displayDataSeries}
      chartSeries={transformed?.chartSeries ?? []}
      readingType={readingType}
      chartRendering={
        isInitialLoading || (dataQuery.isFetching && !dataQuery.data)
      }
      showEmptyState={!isInitialLoading && !hasVisibleValues}
      showReferenceLines={showReferenceLines}
      onToggleReferenceLines={setShowReferenceLines}
      {...(displayDataSeries[0]?.units
        ? { units: displayDataSeries[0].units as string }
        : {})}
    />
  );
}
