import {
  ApiChartDataResponse,
  ApiOutputsResponse,
  // ApiReadingsResponse,
  ApiResponse,
  ApiSensorsResponse,
  ApiSupportedModelsResponse,
  ApiOutputsChartDataResponse,
} from "@sproot/sproot-common/src/api/Responses";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";

const SERVER_URL = import.meta.env["VITE_API_SERVER_URL"];

export async function authenticateAsync(
  username: string,
  password: string,
): Promise<boolean> {
  const response = await fetch(`${SERVER_URL}/api/v1/authenticate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
    // mode: "cors",
    // credentials: "include"
  });
  if (!response.ok) {
    console.error(`Error authenticating: ${response}`);
  }
  const responseJson = await response.json();
  if (responseJson.JWTtoken) {
    return true;
  }
  return false;
}

export async function getSensorsAsync(): Promise<ApiSensorsResponse> {
  const response = await fetch(`${SERVER_URL}/api/v1/sensors`, {
    method: "GET",
    headers: {},
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
  }
  return await response.json();
}

export async function addSensorAsync(
  sensor: ISensorBase,
): Promise<ApiResponse> {
  const response = await fetch(`${SERVER_URL}/api/v1/sensors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sensor),
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error adding sensor: ${response}`);
  }
  return await response.json();
}

export async function deleteSensorAsync(id: number): Promise<ApiResponse> {
  const response = await fetch(`${SERVER_URL}/api/v1/sensors/${id}`, {
    method: "DELETE",
    headers: {},
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting sensor: ${response}`);
  }
  return await response.json();
}

export async function updateSensorAsync(
  sensor: ISensorBase,
): Promise<ApiResponse> {
  const response = await fetch(`${SERVER_URL}/api/v1/sensors/${sensor.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sensor),
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error updating sensor: ${response}`);
  }
  return await response.json();
}

export async function getSupportedSensorModelsAsync(): Promise<ApiSupportedModelsResponse> {
  const response = await fetch(
    `${SERVER_URL}/api/v1/sensors/supported-models`,
    {
      method: "GET",
      headers: {},
      // mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching supported sensor models: ${response}`);
  }
  return await response.json();
}

export async function getSupportedOutputModelsAsync(): Promise<ApiSupportedModelsResponse> {
  const response = await fetch(
    `${SERVER_URL}/api/v1/outputs/supported-models`,
    {
      method: "GET",
      headers: {},
      // mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching supported output models: ${response}`);
  }
  return await response.json();
}

export async function addOutputAsync(
  output: IOutputBase,
): Promise<ApiResponse> {
  const response = await fetch(`${SERVER_URL}/api/v1/outputs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(output),
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error adding output: ${response}`);
  }
  return await response.json();
}

export async function updateOutputAsync(
  output: IOutputBase,
): Promise<ApiResponse> {
  console.log(output);
  const response = await fetch(`${SERVER_URL}/api/v1/outputs/${output.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(output),
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error updating output: ${response}`);
  }
  return await response.json();
}

export async function deleteOutputAsync(id: number): Promise<ApiResponse> {
  const response = await fetch(`${SERVER_URL}/api/v1/outputs/${id}`, {
    method: "DELETE",
    headers: {},
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting output: ${response}`);
  }
  return await response.json();
}

export async function getSensorChartDataAsync(
  readingType: string | undefined = undefined,
  latest: boolean | undefined = undefined,
): Promise<ApiChartDataResponse> {
  let queryString = `${SERVER_URL}/api/v1/sensors/chart-data`;
  const params = [];
  if (readingType) {
    params.push(`readingType=${readingType}`);
  }
  if (latest) {
    params.push(`latest=${latest}`);
  }
  if (params.length > 0) {
    queryString += `?${params.join("&")}`;
  }

  const response = await fetch(queryString, {
    method: "GET",
    headers: {},
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching sensor chart data: ${response}`);
  }
  return await response.json();
}

export async function getOutputChartDataAsync(
  latest: boolean | undefined = undefined,
): Promise<ApiOutputsChartDataResponse> {
  let queryString = `${SERVER_URL}/api/v1/outputs/chart-data`;
  const params = [];
  if (latest) {
    params.push(`latest=${latest}`);
  }
  if (params.length > 0) {
    queryString += `?${params.join("&")}`;
  }

  const response = await fetch(queryString, {
    method: "GET",
    headers: {},
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching output chart data: ${response}`);
  }
  return await response.json();
}

export async function getOutputsAsync(): Promise<ApiOutputsResponse> {
  const response = await fetch(`${SERVER_URL}/api/v1/outputs`, {
    method: "GET",
    headers: {},
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
  }
  return await response.json();
}

export async function setOutputControlModeAsync(
  id: number,
  controlMode: string = "manual",
): Promise<ApiResponse> {
  const response = await fetch(
    `${SERVER_URL}/api/v1/outputs/${id}/control-mode`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ controlMode }),
    },
  );

  if (!response.ok) {
    console.error(`Error setting output control mode: ${response}`);
  }

  return await response.json();
}

export async function setOutputManualStateAsync(
  id: number,
  value: number,
): Promise<ApiResponse> {
  const response = await fetch(
    `${SERVER_URL}/api/v1/outputs/${id}/manual-state`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value }),
    },
  );
  if (!response.ok) {
    console.error(`Error setting output manual state: ${response}`);
  }
  return await response.json();
}
