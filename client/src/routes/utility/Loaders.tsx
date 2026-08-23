import { ReadingType } from "@sproot/sensors/ReadingType";
import {
  getCameraSettingsListAsync,
  getOutputsAsync,
  getReadingTypesAsync,
} from "../../requests/requests_v2";
import { Params } from "react-router-dom";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";

type RootLoaderData = {
  readingTypes: Partial<Record<ReadingType, string>>;
  outputs: Record<string, IOutputBase>;
  cameraSettings: SDBCameraSettings[];
};

const ROOT_LOADER_CACHE_TTL_MS = 30000;

let cachedRootData: RootLoaderData | null = null;
let cachedRootDataAt = 0;
let inFlightRootLoader: Promise<RootLoaderData> | null = null;

export async function rootLoader(): Promise<RootLoaderData> {
  const now = Date.now();
  if (cachedRootData && now - cachedRootDataAt < ROOT_LOADER_CACHE_TTL_MS) {
    return cachedRootData;
  }

  if (inFlightRootLoader) {
    return inFlightRootLoader;
  }

  inFlightRootLoader = Promise.all([
    getReadingTypesAsync(),
    getOutputsAsync(),
    getCameraSettingsListAsync(),
  ])
    .then(([readingTypes, outputs, cameraSettings]) => {
      const data: RootLoaderData = {
        readingTypes,
        outputs,
        cameraSettings,
      };
      cachedRootData = data;
      cachedRootDataAt = Date.now();
      return data;
    })
    .finally(() => {
      inFlightRootLoader = null;
    });

  return inFlightRootLoader;
}

export async function sensorChartDataLoader({
  params,
}: {
  params: Params<"readingType">;
}) {
  return params.readingType;
}
