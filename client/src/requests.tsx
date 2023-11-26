import { ISensorBase } from "@sproot/sproot-common/dist/sensors/SensorBase";

export async function authenticate(username: string, password: string): Promise<boolean> {
  const response = await fetch(
    `http://localhost:3000/api/v1/authenticate`, 
    // `${import.meta.env["VITE_SPROOT_SERVER_URL"]}/api/v1/authenticate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      mode: "cors",
      credentials: "include"
    },
  );
  console.log(response.headers.getSetCookie())
  const responseJson = await response.json();
  if (!response.ok) {
    console.error(`Error authenticating: ${responseJson.message}`);
  }
  console.log(responseJson)
  if (responseJson.JWTtoken) {
    console.log(responseJson.JWTtoken)
    localStorage.setItem("auth-token", responseJson.JWTtoken);
    return true;
  }
  return false;
}

export async function getSensors(): Promise<ISensorBase[]> {
  const response = await fetch(
    `http://localhost:3000/api/v1/sensors`, 
    // `${import.meta.env["VITE_SPROOT_SERVER_URL"]}/api/v1/sensors`, 
    {
      method: "GET",
      mode: "cors",
    }
  );
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
  }
  return await response.json();
}

export async function getSensorById(id: number): Promise<ISensorBase> {
  const response = await fetch(
    `http://localhost:3000/api/v1/sensors/${id}`, 
    // `${import.meta.env["VITE_SPROOT_SERVER_URL"]}/api/v1/sensors/${id}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("auth-token")}`,
      },
    }
  );
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
  }
  return await response.json();
}

export async function getReadingsBySensorId(id: number): Promise<ISensorBase | false> {
  const response = await fetch(
    `http://localhost:3000/api/v1/sensors${id}/readings`, 
    // `${import.meta.env["VITE_SPROOT_SERVER_URL"]}/api/v1/sensors/${id}/readings`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("auth-token")}`,
      },
    }
  );
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
  }
  return await response.json();
}

