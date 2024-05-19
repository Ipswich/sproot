import { useEffect, useState } from "react";
import { Carousel } from "@mantine/carousel";
import "@mantine/carousel/styles.css";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import {
  ChartData,
  ChartDataRecord,
} from "@sproot/sproot-common/src/api/ChartData";
import {
  getSensorsAsync,
  getSensorChartDataAsync,
} from "@sproot/sproot-client/src/requests";
import CarouselSlideContents from "@sproot/sproot-client/src/sensors/CarouselSlideContents";
import { Box, LoadingOverlay } from "@mantine/core";

export default function SensorCarouselContainer() {
  const [sensors, setSensors] = useState({} as Record<string, ISensorBase>);
  const [chartDataRecord, setChartData] = useState({} as ChartDataRecord);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  //GROSS
  let localChartDataRecord = {} as ChartDataRecord;
  useEffect(() => {
    updateSensorsAsync();
    loadChartDataAsync();
    setLastUpdated(new Date());

    const interval = setInterval(async () => {
      await updateSensorsAsync();
      await updateChartDataAsync();
      setLastUpdated(new Date());
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
        getSensorChartDataAsync(readingType).then((data) => {
          result[readingType] = data.chartData[readingType]!;
        }),
      );
    }
    await Promise.allSettled(promises);
    localChartDataRecord = new ChartDataRecord(
      result,
      {} as Record<ReadingType, string[]>,
      parseInt(import.meta.env["VITE_MAX_CHART_DATA_POINTS"] as string),
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
        getSensorChartDataAsync(readingType, true).then((data) => {
          result[readingType]!.push(data.chartData[readingType]![0]!);
        }),
      );
    }
    await Promise.allSettled(promises);
    localChartDataRecord = new ChartDataRecord(
      result,
      filters,
      parseInt(import.meta.env["VITE_MAX_CHART_DATA_POINTS"] as string),
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
          zIndex={200}
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
                        Object.keys(data).filter(
                          (key) => key !== "name" && key !== "units",
                        ),
                      )
                      .flat(),
                  ),
                ];
                return (
                  <Carousel.Slide key={"SwiperSlide-" + readingType}>
                    <CarouselSlideContents
                      lastUpdated={lastUpdated}
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
