import { ISensorBase } from "@sproot/sproot-common/dist/sensors/SensorBase";

const SERVER_URL = ""

export async function authenticate(username: string, password: string): Promise<boolean> {
  const response = await fetch(
    `${SERVER_URL}/api/v1/authenticate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      // mode: "cors",
      // credentials: "include"
    },
  );
  if (!response.ok) {
    console.error(`Error authenticating: ${response}`);
  }
  const responseJson = await response.json();
  if (responseJson.JWTtoken) {
    return true;
  }
  return false;
}

export async function getSensors(): Promise<ISensorBase[]> {
  const response = await fetch(
    `${SERVER_URL}/api/v1/sensors`, 
    {
      method: "GET",
      headers: {
      },
      // mode: "cors",
      // credentials: "include",
    }
  );
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
  }
  return await response.json();
}

export async function getSensorById(id: number): Promise<ISensorBase> {
  const response = await fetch( 
    `${SERVER_URL}/api/v1/sensors/${id}`,
    {
      method: "GET",
    }
  );
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
  }
  return await response.json();
}

export async function getReadingsBySensorId(id: number): Promise<ISensorBase | false> {
  const response = await fetch(
    `${SERVER_URL}/api/v1/sensors/${id}/readings`,
    {
      method: "GET",
    }
  );
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
  }
  return await response.json();
}

