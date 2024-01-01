import { useEffect, useState } from "react";
import "./App.css";
import OutputCard from "./OutputCard";

import { getOutputsAsync, getSensorsAsync } from "./requests";
import {
  ApiOutputsResponse,
  ApiSensorsResponse,
} from "@sproot/sproot-common/dist/api/Responses";
import SensorCard from "./SensorCard";

function App() {
  const [outputs, setOutputs] = useState({} as ApiOutputsResponse);
  const [sensors, setSensors] = useState({} as ApiSensorsResponse);

  useEffect(() => {
    updateOutputsAsync();
    updateSensorsAsync();
  }, []);

  const updateOutputsAsync = async () => {
    setOutputs(await getOutputsAsync());
  };

  const updateSensorsAsync = async () => {
    setSensors(await getSensorsAsync());
  };
  return (
    <>
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
