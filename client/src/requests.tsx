import {
  ApiChartDataResponse,
  ApiOutputsResponse,
  ApiReadingsResponse,
  ApiResponse,
  ApiSensorResponse,
  ApiSensorsResponse,
} from "@sproot/src/api/Responses";

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

export async function getChartDataAsync(
  readingType: string | undefined = undefined,
): Promise<ApiChartDataResponse> {
  let queryString = `${SERVER_URL}/api/v1/sensors/chart-data`;
  if (readingType) {
    queryString += `?readingType=${readingType}`;
  }

  const response = await fetch(queryString, {
    method: "GET",
    headers: {},
    // mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching chart data: ${response}`);
  }
  return await response.json();
}

export async function getSensorById(id: number): Promise<ApiSensorResponse> {
  const response = await fetch(`${SERVER_URL}/api/v1/sensors/${id}`, {
    method: "GET",
  });
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
  }
  return await response.json();
}

export async function getReadingsBySensorIdAsync(
  id: number,
): Promise<ApiReadingsResponse> {
  const response = await fetch(`${SERVER_URL}/api/v1/sensors/${id}/readings`, {
    method: "GET",
  });
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
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
