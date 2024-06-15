import { ISensorBase } from "@sproot/sensors/ISensorBase";
import { SensorList } from "../../../../sensors/list/SensorList";

export default function sensorListHandler(
  sensorList: SensorList,
  sensorId?: string,
): Record<string, ISensorBase> {
  if (sensorId) {
    if (sensorList.sensorData[sensorId]) {
      return {
        [sensorId]: sensorList.sensorData[sensorId] as ISensorBase,
      };
    }
    return {};
  }
  return sensorList.sensorData;
}
