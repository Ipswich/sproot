import "dotenv/config";
import ds18b20 from "ds18b20";
import util from "util";
import winston from "winston";

import { SDBSensor } from "../database/types/SDBSensor";
import { SDBReading } from "../database/types/SDBReading";
import { ISprootDB } from "../database/types/ISprootDB";
import { SensorBase, ReadingType } from "./types/SensorBase";

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
      const reading = String(ds18b20.temperatureSync(this.address!));
      this.lastReading[ReadingType.temperature] = reading;
      this.lastReadingTime = new Date();

      if (this.cachedReadings[ReadingType.temperature].length > 0) {
        this.cachedReadings[ReadingType.temperature].shift();
        this.cachedReadings[ReadingType.temperature].push({
          metric: ReadingType.temperature,
          data: reading,
          unit: this.units[ReadingType.temperature],
          logTime: new Date().toUTCString(),
        } as SDBReading);
      }
    } catch (err) {
      this.#lastError = handleError(err as Error, this.logger, this.#lastError);
    }
  }

  protected override updateCachedReadings(): void {
    try {
      this.cachedReadings[ReadingType.temperature].push({
        metric: ReadingType.temperature,
        data: this.lastReading[ReadingType.temperature],
        unit: this.units[ReadingType.temperature],
        logTime: new Date().toUTCString(),
      } as SDBReading);
      while (
        this.cachedReadings[ReadingType.temperature].length >
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!)
      ) {
        this.cachedReadings[ReadingType.temperature].shift();
      }
    } catch (err) {
      this.logger.error(
        `Failed to update cache readings for sensor ${this.id}`,
      );
      this.logger.error("DS18B20: " + err);
    }
  }

  protected override async loadCachedReadingsFromDatabaseAsync(
    count: number,
  ): Promise<void> {
    const loadedReadingsCount = {} as Record<string, number>;
    try {
      //Fill cached readings with readings from database
      const sdbReadings = await this.sprootDB.getSensorReadingsAsync(
        this,
        new Date(),
        count,
      );
      for (const sdbReading of sdbReadings) {
        const newReading = {
          metric: sdbReading.metric as ReadingType,
          data: sdbReading.data,
          unit: sdbReading.unit,
          logTime: sdbReading.logTime,
        } as SDBReading;
        if (!this.cachedReadings[sdbReading.metric as ReadingType]) {
          this.cachedReadings[sdbReading.metric as ReadingType] = [];
        }
        this.cachedReadings[sdbReading.metric as ReadingType]?.push(newReading);
        loadedReadingsCount[sdbReading.metric as ReadingType] =
          (loadedReadingsCount[sdbReading.metric as ReadingType] ?? 0) + 1;
      }

      this.logger.info(
        `Loaded cached readings for {DS18B20, id: ${
          this.id
        }}. Readings loaded: temperature: ${
          loadedReadingsCount[ReadingType.temperature] ?? 0
        }`,
      );
    } catch (err) {
      this.logger.error(`Failed to load cached readings for sensor {DS18B20, id: ${
        this.id
      }}`);
      this.logger.error("DS18B20: " + err);
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
