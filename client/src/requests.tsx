import { ISensorBase } from "@sproot/sproot-common/dist/sensors/SensorBase";

async function getSensorData(): Promise<ISensorBase[]> {
  const response = await fetch(
    `${import.meta.env["REACT_APP_SPROOT_SERVER_URL"]}/api/v1/sensors`,
  );
  console.log(import.meta.env["REACT_APP_SPROOT_SERVER_URL"]);
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
    return Promise.resolve([]);
  } else {
    return await response.json();
  }
}

export { getSensorData };
