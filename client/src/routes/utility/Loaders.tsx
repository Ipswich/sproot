import { ReadingType } from "@sproot/sensors/ReadingType";
import {
  getOutputsAsync,
  getReadingTypesAsync,
} from "../../requests/requests_v2";
import { Params } from "react-router-dom";
import { IOutputBase } from "@sproot/outputs/IOutputBase";

export async function rootLoader(): Promise<{
  readingTypes: Partial<Record<ReadingType, string>>;
  outputs: Record<string, IOutputBase>;
}> {
  const data = {} as {
    readingTypes: Partial<Record<ReadingType, string>>;
    outputs: Record<string, IOutputBase>;
  };
  await Promise.all([getReadingTypesAsync(), getOutputsAsync()]).then(
    ([readingTypes, outputs]) => {
      data.readingTypes = readingTypes;
      data.outputs = outputs;
    },
  );
  return data;
}

export async function sensorChartDataLoader({
  params,
}: {
  params: Params<"readingType">;
}) {
  return params.readingType;
}
