import { useQuery } from "@tanstack/react-query";
import { Box, Text } from "@mantine/core";
import { useMemo } from "react";
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
  getEffectiveEndDate,
  getEffectiveDisplayEndDate,
  mergeDataIntoTimeline,
  scalePercentile,
} from "../../../requests/chartDataTypes";
import { fetchFanOutPaginatedChartData } from "../../../requests/chartDataPagination";
import { ReadingsChartTransformer } from "./ReadingsChartTransformer";
import ReadingsChart from "./ReadingsChart";
import { isUnitlessAggregate } from "../../../requests/queryTypes";
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
  showReferenceLines: boolean;
  onToggleReferenceLines?: (value: boolean) => void;
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
  showReferenceLines,
  onToggleReferenceLines,
}: ReadingsChartContainerProps) {
  const hiddenDeviceZoneIds = useMemo(
    () => new Set(toggledDeviceZones),
    [toggledDeviceZones],
  );
  const hiddenSensorKeys = useMemo(
    () => new Set(toggledSensors),
    [toggledSensors],
  );

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
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const timeRange = useMemo(() => {
    if (customTimeRange) {
      return [customTimeRange.start, customTimeRange.end] as [Date, Date];
    }

    const end = new Date();
    const start = new Date(end.getTime() - getChartIntervalMs(chartInterval));
    return [start, end] as [Date, Date];
  }, [chartInterval, customTimeRange]);

  const effectiveEnd = getEffectiveEndDate(timeRange[1]);
  const durationMs = effectiveEnd.getTime() - timeRange[0].getTime();
  const downsample = resolveSelectedDownsample(downsampleSelection, durationMs);
  const queryLimit = getQueryPointLimit(durationMs, downsample);

  const sensors = useMemo(() => sensorsQuery.data ?? [], [sensorsQuery.data]);
  const visibleSensors = useMemo(
    () =>
      sensors.filter((sensor) => {
        const deviceZoneId = sensor.deviceZoneId ?? -1;
        return (
          !hiddenDeviceZoneIds.has(String(deviceZoneId)) &&
          !hiddenSensorKeys.has(String(sensor.id)) &&
          !hiddenSensorKeys.has(sensor.name)
        );
      }),
    [hiddenDeviceZoneIds, hiddenSensorKeys, sensors],
  );
  const ids = useMemo(
    () => visibleSensors.map((sensor) => sensor.id),
    [visibleSensors],
  );

  const dataQuery = useQuery({
    queryKey: [
      "sensorData",
      readingType,
      timeRange[0].toISOString(),
      effectiveEnd.toISOString(),
      downsample,
      aggregate,
      percentile,
      ...ids,
    ],
    queryFn: async () => {
      const request: SensorDataQueryRequest = {
        timeRange: {
          start: timeRange[0].toISOString(),
          end: effectiveEnd.toISOString(),
        },
        readingTypes: [readingType],
        downsample,
        limit: queryLimit,
        aggregates: [aggregate],
        ...(percentile !== undefined && {
          percentile: scalePercentile(percentile),
        }),
      };
      return fetchFanOutPaginatedChartData(fetchSensorDataAsync, request, ids);
    },
    enabled: sensorsQuery.isSuccess && ids.length > 0,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const transformed = useMemo(
    () =>
      dataQuery.data?.data && dataQuery.data.data.data.length > 0
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

    const effectiveDisplayEnd = getEffectiveDisplayEndDate(timeRange[1]);
    const mergedDataSeries = mergeDataIntoTimeline(
      buildChartTimeline(timeRange[0], effectiveDisplayEnd, downsample),
      transformed.dataSeries,
    );

    if (
      readingType !== ReadingType.temperature ||
      isUnitlessAggregate(aggregate)
    ) {
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
      allSensorsHidden={
        !isInitialLoading &&
        !hasVisibleValues &&
        sensors.length > 0 &&
        visibleSensors.length === 0
      }
      showReferenceLines={showReferenceLines}
      {...(onToggleReferenceLines ? { onToggleReferenceLines } : {})}
      downsample={downsample}
      aggregate={aggregate}
      {...(displayDataSeries[0]?.units
        ? { units: displayDataSeries[0].units as string }
        : {})}
    />
  );
}
