import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, Keyboard, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { ChartData } from "@sproot/sproot-common/dist/api/ChartData";
import { ApiSensorsResponse } from "@sproot/sproot-common/dist/api/Responses";
// import { ReadingType } from "@sproot/sproot-common/dist/sensors/SensorBase";
import { useEffect, useState } from "react";
import { getChartDataAsync, getSensorsAsync } from "../requests";
import Chart from "./Chart";
import Table from "./Table";

enum ReadingType {
  temperature = "temperature",
  humidity = "humidity",
  pressure = "pressure",
}

export default function SensorSwipeable() {
  const [sensors, setSensors] = useState({} as ApiSensorsResponse);
  const [chartData, setChartData] = useState(
    {} as Record<ReadingType, ChartData[]>,
  );

  const updateSensorsAsync = async () => {
    setSensors(await getSensorsAsync());
  };
  const updateChartAsync = async () => {
    const newChartData = {} as Record<ReadingType, ChartData[]>;
    const promises = [];
    for (const readingType of Object.values(ReadingType)) {
      promises.push(
        getChartDataAsync(readingType).then((data) => {
          newChartData[readingType] = data.chartData[readingType]!;
        }),
      );
    }
    await Promise.allSettled(promises);
    setChartData(newChartData);
    return;
  };

  useEffect(() => {
    updateSensorsAsync();
    updateChartAsync();
    const interval = setInterval(async () => {
      await updateSensorsAsync();
      await updateChartAsync();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Swiper
        direction={"horizontal"}
        slidesPerView={1}
        spaceBetween={30}
        mousewheel={true}
        loop={true}
        keyboard={{
          enabled: true,
        }}
        pagination={{
          clickable: true,
        }}
        navigation={true}
        modules={[Mousewheel, Keyboard, Pagination]}
        className="mySwiper"
      >
        {chartData
          ? Object.keys(chartData)
              .sort()
              .map((readingType) => {
                if (chartData[readingType as ReadingType]!.length === 0) {
                  return <></>;
                }

                const sensorNames = [
                  ...new Set(
                    Object.values(chartData[readingType as ReadingType]!)
                      .map((data) =>
                        Object.keys(data).filter((key) => key !== "name"),
                      )
                      .flat(),
                  ),
                ];
                return (
                  <SwiperSlide key={"SwiperSlide-" + readingType}>
                    <h1>
                      {readingType.charAt(0).toUpperCase() +
                        readingType.slice(1)}
                    </h1>
                    <Chart
                      width={window.innerWidth}
                      height={300}
                      readingType={readingType as ReadingType}
                      chartData={chartData}
                      sensorNames={sensorNames}
                    />
                    <Table
                      readingType={readingType as ReadingType}
                      sensors={sensors.sensors}
                    />
                  </SwiperSlide>
                );
              })
          : "No Chart Data"}
      </Swiper>
    </>
  );
}