import ds18b20 from "ds18b20";
import util from "util";

import { SDBSensor } from "../database/types/SDBSensor";
import { ISprootDB } from "../database/types/ISprootDB";
import { SensorBase, ReadingType } from "./types/SensorBase";
import winston from "winston";

let lastStaticError: Error | undefined = undefined;
class DS18B20 extends SensorBase {
  #lastError: Error | undefined;
  constructor(
    sdbSensor: SDBSensor,
    sprootDB: ISprootDB,
    logger: winston.Logger,
  ) {
    super(sdbSensor, sprootDB, logger);
    this.units[ReadingType.temperature] = "°C";
  }

  override async getReadingAsync(): Promise<void> {
    try {
      this.lastReading[ReadingType.temperature] = String(
        ds18b20.temperatureSync(this.address!),
      );
      this.lastReadingTime = new Date();
    } catch (err) {
      this.#lastError = handleError(err as Error, this.logger, this.#lastError);
    }
  }

  static async getAddressesAsync(logger: winston.Logger): Promise<string[]> {
    try {
      return await util.promisify(ds18b20.sensors)();
    } catch (err) {
      lastStaticError = handleError(err as Error, logger, lastStaticError);
    }
    return [];
  }
}

function handleError(
  err: Error,
  logger: winston.Logger,
  lastError?: Error,
): Error {
  if (err.message !== lastError?.message) {
    lastError = err;
    if (err.message.includes("ENOENT: no such file or directory, open ")) {
      logger.error(
        "Unable to connect to DS18B20 driver. Please ensure your system has 1-wire support enabled.",
      );
    } else {
      logger.error(err);
    }
  }
  return err;
}

export { DS18B20 };
