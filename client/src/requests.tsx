import { ISensorBase } from "@sproot/sproot-common/dist/sensors/SensorBase";

async function getSensorData(): Promise<ISensorBase[]> {
  console.log(
    `${import.meta.env["VITE_SPROOT_SERVER_URL"]}/api/v1/sensors`);
  const response = await fetch(
    `${import.meta.env["VITE_SPROOT_SERVER_URL"]}/api/v1/sensors`,
  );
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
    return Promise.resolve([]);
  } else {
    return await response.json();
  }
}

export { getSensorData };
