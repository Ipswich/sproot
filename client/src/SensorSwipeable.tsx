import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, Keyboard, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import { ChartData } from "@sproot/sproot-common/dist/api/ChartData";
// import { /*ApiSensorsResponse,*/ ApiChartDataResponse } from '@sproot/sproot-common/dist/api/Responses';
import { ReadingType } from "@sproot/sproot-common/src/sensors/SensorBase";
import { useEffect, useState } from "react";
import { getChartDataAsync /*getSensorsAsync*/ } from "./requests";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  // ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// const [sensors, setSensors] = useState({} as ApiSensorsResponse);

// const updateSensorsAsync = async () => {
//   setSensors(await getSensorsAsync());
// };

export default function SensorSwipeable() {
  const [chartData, setChartData] = useState(
    {} as Record<ReadingType, ChartData[]>,
  );
  const updateChartAsync = async () => {
    const newChartData = {} as Record<ReadingType, ChartData[]>;
    const promises = [];
    for (const readingType of Object.values(ReadingType)) {
      promises.push(
        getChartDataAsync().then((data) => {
          newChartData[readingType] = data.chartData[readingType]!;
          setChartData(newChartData);
        }),
      );
    }
    return await Promise.allSettled(promises);
  };

  useEffect(() => {
    // updateSensorsAsync();
    updateChartAsync();
    const interval = setInterval(async () => {
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
          ? Object.keys(chartData).map((readingType) => {
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
                <SwiperSlide>
                  <LineChart
                    width={350}
                    height={300}
                    data={chartData[readingType as ReadingType]!}
                    margin={{
                      top: 5,
                      right: 50,
                      // left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={["auto", "auto"]} />
                    <Tooltip />
                    <Legend />
                    {sensorNames.map((sensorName) => (
                      <Line
                        type="monotone"
                        dataKey={sensorName}
                        stroke="#8884d8"
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </SwiperSlide>
              );
            })
          : "No Chart Data"}
      </Swiper>
    </>
  );
}

// <button
//         onClick={async () => {
//           await updateChartAsync();
//         }}
//       >
//         Update Chart
//       </button>
//       {chartData.chartData
//         ? Object.keys(chartData.chartData).map((readingType) => {
//             if (chartData.chartData[readingType]!.length === 0) {
//               return <></>;
//             }

//             const sensorNames = [
//               ...new Set(
//                 Object.values(chartData.chartData[readingType]!)
//                   .map((data) =>
//                     Object.keys(data).filter((key) => key !== "name"),
//                   )
//                   .flat(),
//               ),
//             ];
//             return (
//               <div>
//                 <LineChart
//                   width={350}
//                   height={300}
//                   data={chartData.chartData[readingType]!}
//                   margin={{
//                     top: 5,
//                     right: 50,
//                     // left: 20,
//                     bottom: 5,
//                   }}
//                 >
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="name" />
//                   <YAxis domain={["auto", "auto"]} />
//                   <Tooltip />
//                   <Legend />
//                   {sensorNames.map((sensorName) => (
//                     <Line
//                       type="monotone"
//                       dataKey={sensorName}
//                       stroke="#8884d8"
//                       dot={false}
//                     />
//                   ))}
//                 </LineChart>
//               </div>
//             );
//           })
//         : "No Chart Data"}
