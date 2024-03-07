import { Fragment, useEffect, useState } from "react";
import OutputCard from "@sproot/sproot-client/src/outputs/OutputCard";
import { getOutputsAsync } from "@sproot/sproot-client/src/requests";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";

export default function OutputState() {
  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);

  const updateOutputsAsync = async () => {
    setOutputs((await getOutputsAsync()).outputs);
  };

  useEffect(() => {
    updateOutputsAsync();
    const interval = setInterval(async () => {
      await updateOutputsAsync();
    }, 60000);

    return () => clearInterval(interval);
  }, []);
  console.log(outputs);
  return (
    <Fragment>
      {Object.keys(outputs).map((key) => (
        <OutputCard
          key={"OutputCard-" + outputs[key]?.id}
          output={outputs[key]!}
          updateOutputsAsync={updateOutputsAsync}
        />
      ))}
    </Fragment>
  );
}
