import { useQuery } from "@tanstack/react-query";
import { Box, Text } from "@mantine/core";
import { getOutputsAsync } from "../../../requests/requests_v2";
import { fetchOutputDataAsync } from "../../../requests/requests_v2";
import { useMemo } from "react";
import {
  getQueryPointLimit,
  resolveSelectedDownsample,
  type Aggregate,
  type OutputDataQueryRequest,
} from "../../../requests/queryTypes";
import {
  buildChartTimeline,
  getChartIntervalMs,
  getEffectiveEndDate,
  getEffectiveDisplayEndDate,
  mergeDataIntoTimeline,
  scalePercentile,
} from "../../../requests/chartDataTypes";
import { fetchFanOutPaginatedChartData } from "../../../requests/chartDataPagination";
import { OutputDataTransformer } from "./OutputDataTransformer";
import StatesChart from "./StatesChart";
import { IOutputBase } from "@sproot/outputs/IOutputBase";

interface StatesChartContainerProps {
  chartInterval: string;
  toggledOutputs?: string[];
  toggledDeviceZones: string[];
  customTimeRange?: { start: Date; end: Date } | null;
  aggregate: Aggregate;
  downsampleSelection: string;
  percentile?: number;
  valueSuffix?: string;
}

export default function StatesChartContainer({
  chartInterval,
  toggledOutputs = [],
  toggledDeviceZones,
  customTimeRange,
  aggregate,
  downsampleSelection,
  percentile,
  valueSuffix,
}: StatesChartContainerProps) {
  const hiddenDeviceZoneIds = useMemo(
    () => new Set(toggledDeviceZones),
    [toggledDeviceZones],
  );
  const hiddenOutputIds = useMemo(
    () => new Set(toggledOutputs),
    [toggledOutputs],
  );

  const outputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: async () => {
      const allOutputs = await getOutputsAsync();
      return Object.values(allOutputs) as IOutputBase[];
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

  const outputs = useMemo(() => outputsQuery.data ?? [], [outputsQuery.data]);
  const visibleOutputs = useMemo(
    () =>
      outputs.filter((output) => {
        const deviceZoneId = output.deviceZoneId ?? -1;
        return (
          output.parentOutputId == null &&
          !hiddenDeviceZoneIds.has(String(deviceZoneId)) &&
          !hiddenOutputIds.has(String(output.id))
        );
      }),
    [hiddenDeviceZoneIds, hiddenOutputIds, outputs],
  );
  const ids = useMemo(
    () => visibleOutputs.map((output) => output.id),
    [visibleOutputs],
  );

  const dataQuery = useQuery({
    queryKey: [
      "outputData",
      timeRange[0].toISOString(),
      effectiveEnd.toISOString(),
      downsample,
      aggregate,
      percentile,
      ...ids,
    ],
    queryFn: async () => {
      const request: OutputDataQueryRequest = {
        timeRange: {
          start: timeRange[0].toISOString(),
          end: effectiveEnd.toISOString(),
        },
        downsample,
        limit: queryLimit,
        aggregates: [aggregate],
        ...(percentile !== undefined && {
          percentile: scalePercentile(percentile),
        }),
      };
      return fetchFanOutPaginatedChartData(fetchOutputDataAsync, request, ids);
    },
    enabled: outputsQuery.isSuccess && ids.length > 0,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const transformed = useMemo(
    () =>
      dataQuery.data?.data && dataQuery.data.data.data.length > 0
        ? OutputDataTransformer.transform(
            dataQuery.data.data,
            visibleOutputs,
            aggregate,
          )
        : null,
    [aggregate, dataQuery.data?.data, visibleOutputs],
  );

  const displayDataSeries = useMemo(() => {
    if (!transformed) {
      return [];
    }

    const effectiveDisplayEnd = getEffectiveDisplayEndDate(timeRange[1]);
    return mergeDataIntoTimeline(
      buildChartTimeline(timeRange[0], effectiveDisplayEnd, downsample),
      transformed.dataSeries,
    );
  }, [downsample, timeRange, transformed]);

  const hasVisibleValues = displayDataSeries.some((dataPoint) =>
    Object.keys(dataPoint).some(
      (key) =>
        key !== "name" && key !== "units" && dataPoint[key] !== undefined,
    ),
  );

  const isInitialLoading =
    outputsQuery.isLoading || (dataQuery.isLoading && !dataQuery.data);

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
    console.log(dataQuery.data.error)
    return (
      <Box>
        <Text c="yellow.7">
          Unable to fetch all data. Showing partial results.
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <StatesChart
        dataSeries={displayDataSeries}
        chartSeries={transformed?.chartSeries ?? []}
        chartRendering={
          isInitialLoading || (dataQuery.isFetching && !dataQuery.data)
        }
        showEmptyState={!isInitialLoading && !hasVisibleValues}
        valueSuffix={valueSuffix ?? transformed?.units ?? "%"}
        aggregate={aggregate}
        downsample={downsample}
      />
    </Box>
  );
}
