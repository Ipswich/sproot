import { Carousel } from "@mantine/carousel";
import "@mantine/carousel/styles.css";
import { Box } from "@mantine/core";
import OutputAccordion from "./OutputAccordion";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { useState, useEffect } from "react";
import { getOutputChartDataAsync, getOutputsAsync } from "../requests";
import { ChartData } from "@sproot/sproot-common/src/utility/IChartable";

export default function SensorCarouselContainer() {
  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);
  const [chartData, setChartData] = useState(
    new ChartData(
      parseInt(import.meta.env["VITE_MAX_CHART_ENTRIES"] as string),
      [],
    ),
  );

  const updateOutputsAsync = async () => {
    setOutputs((await getOutputsAsync()).outputs);
  };

  const loadChartDataAsync = async () => {
    const chartData = await getOutputChartDataAsync();
    setChartData(
      new ChartData(
        parseInt(import.meta.env["VITE_MAX_CHART_ENTRIES"] as string),
        chartData.chartData.dataSeries,
      ),
    );
  };

  const updateChartDataAsync = async () => {
    const newChartData = await getOutputChartDataAsync(true);
    if (!newChartData.chartData.dataSeries[0]) {
      return;
    }
    chartData.addDataPoint(newChartData.chartData.dataSeries[0]);
    setChartData(
      new ChartData(
        parseInt(import.meta.env["VITE_MAX_CHART_ENTRIES"] as string),
        chartData.dataSeries,
      ),
    );
  };

  useEffect(() => {
    updateOutputsAsync();
    loadChartDataAsync();
    const interval = setInterval(async () => {
      await updateOutputsAsync();
      await updateChartDataAsync();
    }, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  console.log(chartData.dataSeries);
  return (
    <>
      <Box pos="relative">
        <Carousel
          loop
          height="100%"
          style={{ flex: 1 }}
          slideGap={20}
          controlsOffset="xs"
        >
          <Carousel.Slide key={"SwiperSlide-Output-States"}>
            <OutputAccordion
              outputs={outputs}
              updateOutputsAsync={updateOutputsAsync}
            ></OutputAccordion>
          </Carousel.Slide>
          <Carousel.Slide key={"SwiperSlide-Output-Chart"}>
            {/* <CarouselSlideContents
                lastUpdated={lastUpdated}
                readingType={readingType as ReadingType}
                sensorNames={sensorNames}
                sensors={sensors}
                chartData={
                  chartDataRecord.chartData[readingType as ReadingType]!
                }
              /> */}
          </Carousel.Slide>
        </Carousel>
      </Box>
    </>
  );
}
