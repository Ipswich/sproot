import ds18b20 from "ds18b20";
import util from "util";

import { SDBSensor } from "../database/types/SDBSensor";
import { ISprootDB } from "../database/types/ISprootDB";
import { SensorBase, ReadingType } from "./types/SensorBase";

let lastStaticError: string | undefined = undefined;
class DS18B20 extends SensorBase {
  constructor(sdbSensor: SDBSensor, sprootDB: ISprootDB) {
    super(sdbSensor, sprootDB);
    this.units[ReadingType.temperature] = "°C";
  }

  override async getReadingAsync(): Promise<void> {
    try {
      this.lastReading[ReadingType.temperature] = String(
        ds18b20.temperatureSync(this.address!),
      );
      this.lastReadingTime = new Date();
    } catch (err) {
      handleError(err as Error);
    }
  }

  static async getAddressesAsync(): Promise<string[]> {
    try {
      return await util.promisify(ds18b20.sensors)();
    } catch (err) {
      handleError(err as Error);
    }
    return [];
  }
}

function handleError(err: Error) {
  if (err?.message !== lastStaticError) {
    lastStaticError = err.message;
    if (
      err.message ===
      "ENOENT: no such file or directory, open '/sys/bus/w1/devices/w1_bus_master1/w1_master_slaves'"
    ) {
      console.error(
        "Unable to connect to DS18B20 driver. Please ensure your system has 1-wire support enabled.",
      );
    } else {
      console.error(err);
    }
  }
}

export { DS18B20 };
