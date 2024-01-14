import { IOutputBase } from "@sproot/sproot-common/dist/outputs/OutputBase";
import {
  setOutputControlModeAsync,
  setOutputManualStateAsync,
} from "./requests";

interface OutputCardProps {
  output: IOutputBase;
  updateOutputsAsync: () => Promise<void>;
}

export default function OutputCard({
  output,
  updateOutputsAsync,
}: OutputCardProps) {
  return (
    <div>
      <p>Output Id: {output.id}</p>
      {output.name ? <p>{output.name}</p> : null}
      <p>Current state: {output.manualState["value"]}</p>
      {output.controlMode != "manual" ? (
        <button
          onClick={async () => await setOutputControlModeAsync(output.id)}
        >
          setOutputControlMode
        </button>
      ) : null}
      <div>
        <button
          onClick={async () => {
            await setOutputManualStateAsync(output.id, 100);
            await updateOutputsAsync();
          }}
        >
          On
        </button>
        <button
          onClick={async () => {
            await setOutputManualStateAsync(output.id, 0);
            await updateOutputsAsync();
          }}
        >
          Off
        </button>
      </div>
    </div>
  );
}
