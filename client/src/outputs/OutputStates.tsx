import "@mantine/carousel/styles.css";
import { Box, Flex, Paper } from "@mantine/core";
import OutputAccordion from "./OutputAccordion";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { useState, useEffect } from "react";
import { getOutputChartDataAsync, getOutputsAsync } from "@sproot/sproot-client/src/requests/requests_v1";
import { ChartData } from "@sproot/sproot-common/src/utility/ChartData";
import ChartContainer from "./ChartContainer";

const colors = [
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "grape",
  "pink",
  "red",
  "orange",
  "yellow",
];

export default function OutputStates() {
  const [chartRendering, setChartRendering] = useState(true);
  // const [_, startTransition] = useTransition();

  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);
  let localChartData = new ChartData(
    parseInt(import.meta.env["VITE_MAX_CHART_DATA_POINTS"] as string),
    parseInt(import.meta.env["VITE_CHART_DATA_POINT_INTERVAL"] as string),
    [],
  );
  const [chartData, setChartData] = useState(localChartData);

  const outputNames = Object.values(outputs)
    .map((output) => output.name)
    .filter((name) => name !== undefined);
  const chartSeries = outputNames.map((outputName, index) => ({
    name: outputName!,
    color: colors[index % colors.length]!,
  }));

  const updateOutputsAsync = async () => {
    setOutputs((await getOutputsAsync()).outputs);
  };

  const loadChartDataAsync = async () => {
    const newChartData = await getOutputChartDataAsync();
    console.time("loadChartDataAsync");
    localChartData = new ChartData(
      parseInt(import.meta.env["VITE_MAX_CHART_DATA_POINTS"] as string),
      parseInt(import.meta.env["VITE_CHART_DATA_POINT_INTERVAL"] as string),
      newChartData.chartData,
    );

    // const timeSpans = ChartData.generateTimeSpansFromDataSeries(localChartData.get());
    // const timeSpansStats = ChartData.generateStatsForTimeSpans(timeSpans);

    console.timeEnd("loadChartDataAsync");
    setChartData(localChartData);
    setChartRendering(false);
  };

  const updateChartDataAsync = async () => {
    const newChartData = await getOutputChartDataAsync(true);
    if (!newChartData.chartData || !newChartData.chartData[0]) {
      return;
    }
    localChartData.addDataPoint(newChartData.chartData[0]);
    localChartData = new ChartData(
      parseInt(import.meta.env["VITE_MAX_CHART_DATA_POINTS"] as string),
      parseInt(import.meta.env["VITE_CHART_DATA_POINT_INTERVAL"] as string),
      localChartData.get(),
    );
    setChartData(localChartData);
  };

  useEffect(() => {
    updateOutputsAsync();
    loadChartDataAsync();
    const interval = setInterval(async () => {
      await updateOutputsAsync();
      await updateChartDataAsync();
    }, 300000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Box pos="relative">
        <Paper shadow="sm" px="md" py="xs" radius="md" withBorder>
          <Flex my={-12}>
            <h2>History</h2>
          </Flex>
          <ChartContainer
            chartData={chartData}
            chartSeries={chartSeries}
            chartRendering={chartRendering}
            setChartRendering={setChartRendering}
          ></ChartContainer>
          <OutputAccordion colorList={colors}></OutputAccordion>
        </Paper>
      </Box>
    </>
  );
}
