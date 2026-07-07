import * as Constants from "@sproot/sproot-common/src/utility/Constants";
import { ChartData } from "@sproot/sproot-common/src/utility/ChartData";
import {
  getQueryPointLimit,
  getChartIntervalHours,
  getDownsampleMinutes,
  resolveSelectedDownsample,
  type Aggregate,
  type OutputDataQueryRequest,
} from "../../../requests/queryTypes";
import { useQuery } from "@tanstack/react-query";
import {
  getOutputsAsync,
  fetchOutputDataAsync,
} from "../../../requests/requests_v2";
import { useMemo } from "react";
import StatesChart from "./StatesChart";
import { transformOutputData } from "./OutputDataTransformer";
import type { IOutputBase } from "@sproot/outputs/IOutputBase";

interface StatesChartContainerProps {
  chartInterval: string;
  toggledDeviceZones: string[];
  customTimeRange?: { start: Date; end: Date } | null;
  aggregate: Aggregate;
  downsampleSelection: string;
  percentile: number;
  valueSuffix: string;
}

export default function StatesChartContainer({
  chartInterval,
  toggledDeviceZones,
  customTimeRange,
  aggregate,
  downsampleSelection,
  percentile,
  valueSuffix,
}: StatesChartContainerProps) {
  const outputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: () => getOutputsAsync(),
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
      "output-states-chart",
      timeRange.start,
      timeRange.end,
      downsample,
      aggregate,
      percentile,
    ],
    queryFn: async () => {
      const request: OutputDataQueryRequest = {
        timeRange,
        downsample,
        limit: queryLimit,
        aggregates: [aggregate],
      };
      if (aggregate === "percentile") {
        request.percentile = percentile;
      }
      return fetchOutputDataAsync(request);
    },
    refetchInterval: 300000,
    enabled: !!outputsQuery.data,
    placeholderData: (previousData) => previousData,
  });

  const outputObjects = useMemo(() => {
    if (!outputsQuery.data) return {};
    const result: Record<number, IOutputBase> = {};
    for (const key of Object.keys(outputsQuery.data)) {
      const output = outputsQuery.data[key]!;
      result[output.id] = output;
    }
    return result;
  }, [outputsQuery.data]);

  const transformedData = useMemo(() => {
    if (!chartDataQuery.data) return null;
    return transformOutputData(chartDataQuery.data, outputObjects, aggregate);
  }, [aggregate, chartDataQuery.data, outputObjects]);

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

  // Build hidden output list
  const hiddenOutputsFromDeviceZones = Object.values(outputsQuery.data ?? {})
    .filter((output: any) => {
      return toggledDeviceZones.includes(
        (output.deviceZoneId ?? -1).toString(),
      );
    })
    .map((output: any) => output.name ?? "");

  const hiddenOutputs =
    hiddenOutputsFromDeviceZones.length ===
    Object.values(outputsQuery.data ?? {}).length
      ? []
      : hiddenOutputsFromDeviceZones;

  const filteredData = ChartData.filterChartData(
    activeDataSeries,
    hiddenOutputs,
  );
  const hasVisibleValues = filteredData.some((dataPoint) =>
    Object.keys(dataPoint).some((key) => key !== "name" && key !== "units"),
  );
  return (
    <StatesChart
      dataSeries={filteredData}
      chartSeries={transformedData?.chartSeries ?? []}
      chartRendering={chartDataQuery.isPending && !chartDataQuery.data}
      showEmptyState={!hasVisibleValues}
      valueSuffix={valueSuffix}
    />
  );
}
