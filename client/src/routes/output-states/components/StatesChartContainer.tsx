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
  mergeDataIntoTimeline,
  scalePercentile,
} from "../../../requests/chartDataTypes";
import { fetchPaginatedChartData } from "../../../requests/chartDataPagination";
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
  const outputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: async () => {
      const allOutputs = await getOutputsAsync();
      return Object.values(allOutputs) as IOutputBase[];
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

  const outputs = outputsQuery.data || [];
  const visibleOutputs = useMemo(
    () =>
      outputs.filter((output) => {
        const deviceZoneId = output.deviceZoneId ?? -1;
        return (
          !toggledDeviceZones.includes(String(deviceZoneId)) &&
          !toggledOutputs.includes(String(output.id))
        );
      }),
    [outputs, toggledDeviceZones, toggledOutputs],
  );
  const ids = visibleOutputs.map((output) => output.id);

  const dataQuery = useQuery({
    queryKey: [
      "outputData",
      timeRange[0].toISOString(),
      timeRange[1].toISOString(),
      downsample,
      aggregate,
      percentile,
      ...ids,
    ],
    queryFn: async () => {
      const request: OutputDataQueryRequest = {
        timeRange: {
          start: timeRange[0].toISOString(),
          end: timeRange[1].toISOString(),
        },
        downsample,
        limit: queryLimit,
        aggregates: [aggregate],
        ids,
        ...(percentile !== undefined && {
          percentile: scalePercentile(percentile),
        }),
      };
      return fetchPaginatedChartData(fetchOutputDataAsync, request);
    },
    enabled: outputsQuery.isSuccess && ids.length > 0,
    refetchInterval: 300000,
    placeholderData: (previousData) => previousData,
  });

  const transformed = useMemo(
    () =>
      dataQuery.data?.data
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

    return mergeDataIntoTimeline(
      buildChartTimeline(timeRange[0], timeRange[1], downsample),
      transformed.dataSeries,
    );
  }, [downsample, timeRange, transformed]);

  const hasVisibleValues = displayDataSeries.some((dataPoint) =>
    Object.keys(dataPoint).some(
      (key) =>
        key !== "name" && key !== "units" && dataPoint[key] !== undefined,
    ),
  );

  if (outputsQuery.isLoading || (dataQuery.isLoading && !dataQuery.data)) {
    return (
      <Box>
        <Text>Loading chart data...</Text>
      </Box>
    );
  }

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
    <Box>
      <StatesChart
        dataSeries={displayDataSeries}
        chartSeries={transformed?.chartSeries ?? []}
        chartRendering={dataQuery.isFetching && !dataQuery.data}
        showEmptyState={!hasVisibleValues}
        valueSuffix={valueSuffix ?? transformed?.units ?? "%"}
      />
    </Box>
  );
}
