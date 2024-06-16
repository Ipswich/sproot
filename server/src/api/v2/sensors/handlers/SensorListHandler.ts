import { ISensorBase } from "@sproot/sensors/ISensorBase";
import { SensorList } from "../../../../sensors/list/SensorList";

export default function sensorListHandler(
  sensorList: SensorList,
  sensorId?: string,
): ISensorBase[] {
  if (sensorId) {
    if (sensorList.sensorData[sensorId]) {
      return [sensorList.sensorData[sensorId] as ISensorBase];
    }
    return [];
  }
  return Object.values(sensorList.sensorData);
}
