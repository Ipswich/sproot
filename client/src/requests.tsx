
import { ISensorBase } from "@sproot/sproot-common/dist/sensors/SensorBase";

async function getSensorData(): Promise<ISensorBase[]> {
  const response = await fetch(`${process.env["SPROOT_SERVER_URL"]}/api/v1/sensors`);
  console.log(process.env["SPROOT_SERVER_URL"]);
  if (!response.ok) {
    console.error(`Error fetching sensor data: ${response}`);
    return Promise.resolve([]);
  } else {
    return await response.json();
  }
}

export { getSensorData };