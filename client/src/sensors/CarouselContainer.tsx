import { useEffect, useState } from "react";
import { Carousel } from "@mantine/carousel";
import "@mantine/carousel/styles.css";
import {
  ISensorBase,
  ReadingType,
} from "@sproot/sproot-common/src/sensors/SensorBase";
import {
  ChartData,
  ChartDataRecord,
} from "@sproot/sproot-common/src/api/ChartData";
import { getSensorsAsync, getChartDataAsync } from "../requests";
import CarouselSlideContents from "./CarouselSlideContents";
import { Box, LoadingOverlay } from "@mantine/core";

export default function CarouselContainer() {
  const [sensors, setSensors] = useState({} as Record<string, ISensorBase>);
  const [chartDataRecord, setChartData] = useState({} as ChartDataRecord);

  //GROSS
  let localChartDataRecord = {} as ChartDataRecord;
  useEffect(() => {
    updateSensorsAsync();
    loadChartDataAsync();

    const interval = setInterval(async () => {
      await updateSensorsAsync();
      await updateChartDataAsync();
    }, 300000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSensorsAsync = async () => {
    setSensors((await getSensorsAsync()).sensors);
  };

  const loadChartDataAsync = async () => {
    const promises = [];
    const result = {} as Record<string, ChartData[]>;
    for (const readingType of Object.values(ReadingType)) {
      promises.push(
        getChartDataAsync(readingType).then((data) => {
          result[readingType] = data.chartData[readingType]!;
        }),
      );
    }
    await Promise.allSettled(promises);
    localChartDataRecord = new ChartDataRecord(
      result,
      {} as Record<ReadingType, string[]>,
      parseInt(import.meta.env["VITE_MAX_CHART_ENTRIES"] as string),
    );
    setChartData(localChartDataRecord);
  };

  const updateChartDataAsync = async () => {
    const promises = [];
    const result = localChartDataRecord.chartData;
    const filters = {} as Record<ReadingType, string[]>;
    for (const readingType of Object.values(ReadingType)) {
      filters[readingType] =
        localChartDataRecord.chartSubData[readingType].filters;
      promises.push(
        getChartDataAsync(readingType, true).then((data) => {
          result[readingType]!.push(data.chartData[readingType]![0]!);
        }),
      );
    }
    await Promise.allSettled(promises);
    localChartDataRecord = new ChartDataRecord(
      result,
      filters,
      parseInt(import.meta.env["VITE_MAX_CHART_ENTRIES"] as string),
    );
    setChartData(localChartDataRecord);
    return;
  };

  return (
    <>
      <Box pos="relative">
        <LoadingOverlay
          style={{ height: "100%" }}
          visible={chartDataRecord.chartData === undefined}
          zIndex={1000}
          loaderProps={{ color: "teal", type: "bars", size: "lg" }}
        />
        <Carousel
          loop
          height="100%"
          style={{ flex: 1 }}
          slideGap={20}
          controlsOffset="xs"
        >
          {chartDataRecord.chartData ? (
            Object.keys(chartDataRecord.chartData)
              .sort()
              .map((readingType) => {
                if (
                  chartDataRecord.chartData[readingType as ReadingType]!
                    .length === 0
                ) {
                  return <></>;
                }

                const sensorNames = [
                  ...new Set(
                    Object.values(
                      chartDataRecord.chartData[readingType as ReadingType]!,
                    )
                      .map((data) =>
                        Object.keys(data).filter((key) => key !== "name"),
                      )
                      .flat(),
                  ),
                ];
                return (
                  <Carousel.Slide key={"SwiperSlide-" + readingType}>
                    <CarouselSlideContents
                      readingType={readingType as ReadingType}
                      sensorNames={sensorNames}
                      sensors={sensors}
                      chartData={
                        chartDataRecord.chartData[readingType as ReadingType]!
                      }
                    />
                  </Carousel.Slide>
                );
              })
          ) : (
            <div style={{ minHeight: "450px" }}></div>
          )}
        </Carousel>
      </Box>
    </>
  );
}
