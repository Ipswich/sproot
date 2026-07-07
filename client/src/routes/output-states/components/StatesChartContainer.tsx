import { ChartData } from "@sproot/sproot-common/src/utility/ChartData";
import type { OutputDataQueryRequest } from "@sproot/requests/queryTypes";
import { useQuery } from "@tanstack/react-query";
import {
  getOutputsAsync,
  fetchOutputDataAsync,
} from "../../../requests/requests_v2";
import { useMemo, useState } from "react";
import { Flex } from "@mantine/core";
import StatesChart from "./StatesChart";
import { transformOutputData } from "./OutputDataTransformer";
import type { IOutputBase } from "@sproot/outputs/IOutputBase";

interface StatesChartContainerProps {
  chartInterval: string;
  chartRendering: boolean;
  setChartRendering: (value: boolean) => void;
  toggledDeviceZones: string[];
  customTimeRange?: { start: Date; end: Date } | null;
}

export default function StatesChartContainer({
  chartInterval,
  chartRendering,
  setChartRendering,
  toggledDeviceZones,
  customTimeRange,
}: StatesChartContainerProps) {
  const [isFetching, setIsFetching] = useState(false);

  const outputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: () => getOutputsAsync(),
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
      const durationMs =
        customTimeRange.end.getTime() - customTimeRange.start.getTime();
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
    queryKey: [
      "output-states-chart",
      timeRange.start,
      timeRange.end,
      downsample,
    ],
    queryFn: async () => {
      setIsFetching(true);
      const request: OutputDataQueryRequest = {
        timeRange,
        downsample,
        limit: 2000,
        aggregates: ["avg", "min", "max"],
      };
      const response = await fetchOutputDataAsync(request);
      setChartRendering(false);
      setIsFetching(false);
      return response;
    },
    refetchInterval: 300000,
    enabled: !!outputsQuery.data,
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
    return transformOutputData(chartDataQuery.data, outputObjects);
  }, [chartDataQuery.data, outputObjects]);

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

  const filteredData = transformedData
    ? ChartData.filterChartData(transformedData.dataSeries, hiddenOutputs)
    : [];

  return (
    <>
      <Flex my={-12}>
        <h2>History</h2>
        <h5>{"%"}</h5>
      </Flex>
      <StatesChart
        dataSeries={filteredData}
        chartSeries={transformedData?.chartSeries ?? []}
        chartRendering={
          isFetching || chartDataQuery.isPending || chartRendering
        }
        showEmptyState={filteredData.length === 0}
      />
    </>
  );
}
