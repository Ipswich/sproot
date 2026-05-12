import * as Constants from "@sproot/sproot-common/src/utility/Constants";
import {
  ChartData,
  ChartSeries,
} from "@sproot/sproot-common/src/utility/ChartData";
import { useQuery } from "@tanstack/react-query";
import {
  getOutputChartDataAsync,
  getOutputsAsync,
} from "../../../requests/requests_v2";
import { Fragment, useEffect, useState } from "react";
import { Flex } from "@mantine/core";
import StatesChart from "./StatesChart";

interface StatesChartContainerProps {
  chartInterval: string;
  chartRendering: boolean;
  setChartRendering: (value: boolean) => void;
  toggledDeviceZones: string[];
}

export default function StatesChartContainer({
  chartInterval,
  chartRendering,
  setChartRendering,
  toggledDeviceZones,
}: StatesChartContainerProps) {
  const baseChartData = new ChartData(
    Constants.MAX_CHART_DATA_POINTS,
    Constants.CHART_DATA_POINT_INTERVAL,
  );
  const [timeSpans, setTimeSpans] = useState(
    ChartData.generateTimeSpansFromDataSeries(
      baseChartData.get(),
      baseChartData.intervalMinutes,
    ),
  );
  const [chartSeries, setChartSeries] = useState([] as ChartSeries[]);

  const chartDataQuery = useQuery({
    queryKey: ["output-states-chart"],
    queryFn: () => getOutputChartDataAsync(),
    refetchInterval: 300000,
  });

  const outputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: () => getOutputsAsync(),
    refetchInterval: 60000,
  });

  const updateAsync = async () => {
    const newData = (await chartDataQuery.refetch()).data!;
    const baseChartData = new ChartData(
      Constants.MAX_CHART_DATA_POINTS,
      Constants.CHART_DATA_POINT_INTERVAL,
      newData.data,
    );
    setTimeSpans(
      ChartData.generateTimeSpansFromDataSeries(
        baseChartData.get(),
        baseChartData.intervalMinutes,
      ),
    );
    setChartSeries(newData.series);
    setChartRendering(false);
  };

  useEffect(() => {
    updateAsync();

    const interval = setInterval(() => {
      updateAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hiddenOutputsFromDeviceZones = (
    Object.values(outputsQuery.data ?? {}) ?? []
  )
    .filter((output) => {
      return toggledDeviceZones.includes(
        (output.deviceZoneId ?? -1).toString(),
      );
    })
    .map((output) => output.name ?? "");

  const hiddenOutputs =
    hiddenOutputsFromDeviceZones.length ==
    Object.values(outputsQuery.data ?? {}).length
      ? []
      : hiddenOutputsFromDeviceZones;
  return (
    <Fragment>
      <Flex my={-12}>
        <h2>History</h2>
        <h5>{"%"}</h5>
      </Flex>
      <StatesChart
        dataSeries={ChartData.filterChartData(
          timeSpans[parseInt(chartInterval)]!,
          hiddenOutputs,
        )}
        chartSeries={chartSeries}
        chartRendering={chartDataQuery.isPending || chartRendering}
      />
    </Fragment>
  );
}
