import { Fragment, useEffect, useState } from "react";
import OutputCard from "./OutputCard";
import { getOutputsAsync } from "../requests";
import { IOutputBase } from "@sproot/src/outputs/OutputBase";

export default function OutputState() {
  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);

  const updateOutputsAsync = async () => {
    setOutputs((await getOutputsAsync()).outputs);
  };

  useEffect(() => {
    updateOutputsAsync();
    const interval = setInterval(async () => {
      await updateOutputsAsync();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

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
