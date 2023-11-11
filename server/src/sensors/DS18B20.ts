import "dotenv/config";
import ds18b20 from "ds18b20";
import util from "util";
import winston from "winston";

import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SensorBase, ReadingType } from "@sproot/sproot-common/dist/sensors/SensorBase";

class DS18B20 extends SensorBase {
  constructor(sdbSensor: SDBSensor, sprootDB: ISprootDB, logger: winston.Logger) {
    super(sdbSensor, sprootDB, logger);
    this.units[ReadingType.temperature] = "°C";
    this.cachedReadings[ReadingType.temperature] = [];
  }

  async initAsync(): Promise<DS18B20 | null> {
    try {
      await this.loadCachedReadingsFromDatabaseAsync(
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!),
      );
    } catch (err) {
      handleError(err as Error, this.logger);
      return null;
    }
    return this;
  }

  override async getReadingAsync(): Promise<void> {
    const getReadingTimer = this.logger.startTimer();
    ds18b20.temperature(this.address!, (err, value) => {
      try {
        if (err != null) {
          handleError(err as Error, this.logger);
          this.logger.error(
            `Failed to get reading for sensor {DS18B20, id: ${this.id}, address: ${this.address}}`,
          );
        } else {
          const reading = String(value);
          this.lastReading[ReadingType.temperature] = reading;
          this.lastReadingTime = new Date();

          if (this.cachedReadings[ReadingType.temperature].length > 0) {
            this.cachedReadings[ReadingType.temperature].shift();
            this.cachedReadings[ReadingType.temperature].push({
              metric: ReadingType.temperature,
              data: reading,
              units: this.units[ReadingType.temperature],
              logTime: new Date().toUTCString(),
            } as SDBReading);
          }
        }
      } catch (e) {
        handleError(err as Error, this.logger);
        this.logger.error(
          `Failed to get reading for sensor {DS18B20, id: ${this.id}, address: ${this.address}}`,
        );
      } finally {
        getReadingTimer.done({
          message: `Reading time for sensor {DS18B20, id: ${this.id}, address: ${this.address}}`,
        });
      }
    });
  }

  protected override updateCachedReadings(): void {
    try {
      this.cachedReadings[ReadingType.temperature].push({
        metric: ReadingType.temperature,
        data: this.lastReading[ReadingType.temperature],
        units: this.units[ReadingType.temperature],
        logTime: new Date().toUTCString(),
      } as SDBReading);
      while (
        this.cachedReadings[ReadingType.temperature].length >
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!)
      ) {
        this.cachedReadings[ReadingType.temperature].shift();
      }
      this.logger.info(
        `Updated cached readings for {DS18B20, id: ${this.id}}. Cache Size - temperature: ${
          this.cachedReadings[ReadingType.temperature].length
        }`,
      );
    } catch (err) {
      this.logger.error(`Failed to update cached readings for {DS18B20, id: ${this.id}}`);
      this.logger.error("DS18B20: " + err);
    }
  }

  protected override async loadCachedReadingsFromDatabaseAsync(count: number): Promise<void> {
    this.cachedReadings[ReadingType.temperature] = [];
    try {
      //Fill cached readings with readings from database
      const sdbReadings = await this.sprootDB.getSensorReadingsAsync(this, new Date(), count);
      for (const sdbReading of sdbReadings) {
        const newReading = {
          metric: sdbReading.metric as ReadingType,
          data: sdbReading.data,
          units: sdbReading.units,
          logTime: sdbReading.logTime,
        } as SDBReading;
        this.cachedReadings[sdbReading.metric as ReadingType]?.push(newReading);
      }

      this.logger.info(
        `Loaded cached readings for {DS18B20, id: ${this.id}}. Cache Size - temperature: ${
          this.cachedReadings[ReadingType.temperature].length
        }`,
      );
    } catch (err) {
      this.logger.error(`Failed to load cached readings for sensor {DS18B20, id: ${this.id}}`);
      this.logger.error("DS18B20: " + err);
    }
  }

  static async getAddressesAsync(logger: winston.Logger): Promise<string[]> {
    try {
      return await util.promisify(ds18b20.sensors)();
    } catch (err) {
      handleError(err as Error, logger);
      logger.error("Failed to get DS18B20 addresses");
    }
    return [];
  }
}

function handleError(err: Error, logger: winston.Logger): void {
  if (err.message.includes("ENOENT: no such file or directory, open ")) {
    logger.error(
      "Unable to connect to DS18B20 driver. Please ensure your system has 1-wire support enabled.",
    );
  } else {
    logger.error("DS18B20: " + err);
  }
}

export { DS18B20 };
