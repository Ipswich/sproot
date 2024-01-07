import { useEffect, useState } from "react";
import "./App.css";
import OutputCard from "./OutputCard";

import {
  getChartDataAsync,
  getOutputsAsync,
  getSensorsAsync,
} from "./requests";
import {
  ApiChartDataResponse,
  ApiOutputsResponse,
  ApiSensorsResponse,
} from "@sproot/sproot-common/dist/api/Responses";
import SensorCard from "./SensorCard";
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

function App() {
  const [outputs, setOutputs] = useState({} as ApiOutputsResponse);
  const [sensors, setSensors] = useState({} as ApiSensorsResponse);
  const [chartData, setChartData] = useState({} as ApiChartDataResponse);

  useEffect(() => {
    updateOutputsAsync();
    updateSensorsAsync();
    updateChartAsync();
  }, []);

  const updateOutputsAsync = async () => {
    setOutputs(await getOutputsAsync());
  };

  const updateSensorsAsync = async () => {
    setSensors(await getSensorsAsync());
  };

  const updateChartAsync = async () => {
    setChartData(await getChartDataAsync());
  };

  return (
    <>
      <button
        onClick={async () => {
          await updateChartAsync();
        }}
      >
        Update Chart
      </button>
      {chartData.chartData
        ? Object.keys(chartData.chartData).map((readingType) => {
            if (chartData.chartData[readingType]!.length === 0) {
              return <></>;
            }

            const sensorNames = [
              ...new Set(
                Object.values(chartData.chartData[readingType]!)
                  .map((data) =>
                    Object.keys(data).filter((key) => key !== "name"),
                  )
                  .flat(),
              ),
            ];
            return (
              <div>
                {/* <ResponsiveContainer width="100%" height="100%"> */}
                <LineChart
                  width={400}
                  height={300}
                  data={chartData.chartData[readingType]!}
                  margin={{
                    top: 5,
                    // right: 30,
                    // left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
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
                {/* </ResponsiveContainer> */}
              </div>

              // <LineChart width={730} height={250} data={chartData.chartData[readingType]!}
              //   margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              //   <CartesianGrid strokeDasharray="3 3" />
              //   <XAxis dataKey="name" />
              //   <YAxis />
              //   <Tooltip />
              //   <Legend />
              //   {... sensorsNames.map((sensorName) => (
              //     <Line type="monotone" dataKey={sensorName} stroke="#8884d8" />
              //   ))}
              // </LineChart>
            );
          })
        : "No Chart Data"}
      <div className="card">
        <br></br>
        {outputs.outputs
          ? Object.keys(outputs.outputs).map((key) => (
              <OutputCard
                key={"OutputCard-" + outputs.outputs[key]?.id}
                output={outputs.outputs[key]!}
                updateOutputsAsync={updateOutputsAsync}
              />
            ))
          : "No Outputs"}
        <br></br>
        <button
          onClick={async () => {
            await updateSensorsAsync();
          }}
        >
          Update Sensors
        </button>
        {sensors.sensors
          ? Object.keys(sensors.sensors).map((key) => (
              <SensorCard
                key={"SensorCard-" + sensors.sensors[key]?.id}
                sensor={sensors.sensors[key]!}
                updateSensorsAsync={updateSensorsAsync}
              />
            ))
          : "No Sensors"}
      </div>
    </>
  );
}

export default App;
