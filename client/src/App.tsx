import { useEffect, useState } from "react";
import "./App.css";
import OutputCard from "./OutputCard";

import { ApiOutputsResponse } from "@sproot/sproot-common/dist/api/Responses";

import SensorSwipeable from "./sensors/Swipeable";
import { getOutputsAsync } from "./requests";

function App() {
  const [outputs, setOutputs] = useState({} as ApiOutputsResponse);

  useEffect(() => {
    updateOutputsAsync();
  }, []);

  const updateOutputsAsync = async () => {
    setOutputs(await getOutputsAsync());
  };

  return (
    <>
      <div>
        <SensorSwipeable />
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
      </div>
    </>
  );
}

export default App;
