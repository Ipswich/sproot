import { ReadingType } from "@sproot/sensors/ReadingType";
import {
  getCameraSettingsAsync,
  getOutputsAsync,
  getReadingTypesAsync,
} from "../../requests/requests_v2";
import { Params } from "react-router-dom";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";

export async function rootLoader(): Promise<{
  readingTypes: Partial<Record<ReadingType, string>>;
  outputs: Record<string, IOutputBase>;
  cameraSettings: SDBCameraSettings;
}> {
  const data = {} as {
    readingTypes: Partial<Record<ReadingType, string>>;
    outputs: Record<string, IOutputBase>;
    cameraSettings: SDBCameraSettings;
  };
  await Promise.all([
    getReadingTypesAsync(),
    getOutputsAsync(),
    getCameraSettingsAsync(),
  ]).then(([readingTypes, outputs, cameraSettings]) => {
    data.readingTypes = readingTypes;
    data.outputs = outputs;
    data.cameraSettings = cameraSettings;
  });
  return data;
}

export async function sensorChartDataLoader({
  params,
}: {
  params: Params<"readingType">;
}) {
  return params.readingType;
}
