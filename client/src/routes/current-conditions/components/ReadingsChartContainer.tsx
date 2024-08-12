import {
  ChartSeries,
  ChartData,
} from "@sproot/sproot-common/src/utility/ChartData";
import {
  ReadingType,
  Units,
} from "@sproot/sproot-common/src/sensors/ReadingType";
import { Fragment, useEffect, useState } from "react";
import { getSensorChartDataAsync } from "../../../requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import ReadingsChart from "./ReadingsChart";
import { Flex } from "@mantine/core";

export interface ReadingsChartContainerProps {
  readingType: string;
  chartInterval: string;
  toggledSensors: string[];
  chartRendering: boolean;
  setChartRendering: (value: boolean) => void;
}

export default function ReadingsChartContainer({
  readingType,
  chartInterval,
  toggledSensors,
  chartRendering,
  setChartRendering,
}: ReadingsChartContainerProps) {
  const baseChartData = new ChartData(
    import.meta.env["VITE_MAX_CHART_DATA_POINTS"],
    import.meta.env["VITE_CHART_DATA_POINT_INTERVAL"],
  );
  const [timeSpans, setTimeSpans] = useState(
    ChartData.generateTimeSpansFromDataSeries(
      baseChartData.get(),
      baseChartData.intervalMinutes,
    ),
  );
  const [chartSeries, setChartSeries] = useState([] as ChartSeries[]);

  const chartDataQuery = useQuery({
    queryKey: ["current-conditions-chart"],
    queryFn: () => getSensorChartDataAsync(readingType),
    refetchInterval: 300000,
  });

  const updateAsync = async () => {
    const newData = (await chartDataQuery.refetch()).data!;
    const baseChartData = new ChartData(
      import.meta.env["VITE_MAX_CHART_DATA_POINTS"],
      import.meta.env["VITE_CHART_DATA_POINT_INTERVAL"],
      newData.data[readingType as ReadingType],
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
  }, [readingType]);

  return (
    <Fragment>
      <Flex my={-12}>
        <h2>{readingType.charAt(0).toUpperCase() + readingType.slice(1)}</h2>
        <h5>{Units[readingType as ReadingType]}</h5>
      </Flex>
      <ReadingsChart
        dataSeries={ChartData.filterChartData(
          timeSpans[parseInt(chartInterval)]!,
          toggledSensors,
        )}
        chartSeries={chartSeries}
        chartRendering={chartDataQuery.isPending || chartRendering}
      />
    </Fragment>
  );
}
