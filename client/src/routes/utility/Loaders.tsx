import { ReadingType } from "@sproot/sensors/ReadingType";
import {
  clearAuthenticationToken,
  getAuthenticationStateAsync,
  getAuthenticationToken,
  getCameraSettingsListAsync,
  getOutputsAsync,
  getReadingTypesAsync,
} from "../../requests/requests_v2";
import { Params, redirect } from "react-router-dom";
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

export function clearRootLoaderCache(): void {
  cachedRootData = null;
  cachedRootDataAt = 0;
  inFlightRootLoader = null;
}

export async function requireAppAccessLoader({
  request,
}: {
  request: Request;
}): Promise<RootLoaderData> {
  const authState = await getAuthenticationStateAsync();
  const currentPath = new URL(request.url).pathname;
  const token = getAuthenticationToken();

  if (authState.requiresSetup) {
    clearAuthenticationToken();
    if (currentPath !== "/first-time-setup") {
      throw redirect("/first-time-setup");
    }
  }

  if (authState.authenticationEnabled && !authState.requiresSetup && !token) {
    if (currentPath !== "/login") {
      throw redirect("/login");
    }
  }

  if (!authState.authenticationEnabled && (currentPath === "/login" || currentPath === "/first-time-setup")) {
    throw redirect("/");
  }

  return rootLoader();
}

export async function requireLoginPageAccessLoader({
  request,
}: {
  request: Request;
}): Promise<null> {
  const authState = await getAuthenticationStateAsync();
  const token = getAuthenticationToken();
  const currentPath = new URL(request.url).pathname;

  if (authState.requiresSetup && currentPath !== "/first-time-setup") {
    throw redirect("/first-time-setup");
  }

  if (!authState.authenticationEnabled) {
    throw redirect("/");
  }

  if (token) {
    throw redirect("/");
  }

  return null;
}

export async function requireFirstTimeSetupPageAccessLoader({
  request,
}: {
  request: Request;
}): Promise<null> {
  const authState = await getAuthenticationStateAsync();
  const token = getAuthenticationToken();
  const currentPath = new URL(request.url).pathname;

  if (!authState.requiresSetup) {
    if (authState.authenticationEnabled && !token && currentPath !== "/login") {
      throw redirect("/login");
    }

    throw redirect("/");
  }

  return null;
}

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
