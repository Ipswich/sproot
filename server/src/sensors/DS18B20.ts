import "dotenv/config";
import { readFile } from "node:fs/promises";
import winston from "winston";

import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SensorBase, ReadingType } from "@sproot/sproot-common/dist/sensors/SensorBase";

class DS18B20 extends SensorBase {
  readonly MAX_SENSOR_READ_TIME = 3500;

  constructor(sdbSensor: SDBSensor, sprootDB: ISprootDB, logger: winston.Logger) {
    super(sdbSensor, sprootDB, logger);
    this.units[ReadingType.temperature] = "°C";
    this.cachedReadings[ReadingType.temperature] = [];
  }

  async initAsync(): Promise<DS18B20 | null> {
    const profiler = this.logger.startTimer();
    try {
      await this.loadCachedReadingsFromDatabaseAsync(Number(process.env["INITIAL_CACHE_LOOKBACK"]));
      this.updateInterval = setInterval(async () => {
        const profiler = this.logger.startTimer();
        await this.getReadingAsync();
        profiler.done({
          message: `Reading time for sensor {DS18B20, id: ${this.id}, address: ${this.address}`,
          level: "debug",
        });
      }, this.MAX_SENSOR_READ_TIME);
    } catch (err) {
      this.logger.error(`Failed to create DS18B20 sensor ${this.id}. ${err}`);
      return null;
    } finally {
      profiler.done({
        message: `Initialization time for sensor {DS18B20, id: ${this.id}, address: ${this.address}`,
        level: "debug",
      });
    }
    return this;
  }

  override async getReadingAsync(): Promise<void> {
    try {
      const result = await readTemperatureFromDeviceAsync(this.address!);
      if (result === false) {
        throw new Error("Invalid reading from sensor.");
      }
      const reading = String(result);
      this.lastReading[ReadingType.temperature] = reading;
      this.lastReadingTime = new Date();
    } catch (err) {
      this.logger.error(
        `Failed to get reading for sensor {DS18B20, id: ${this.id}, address: ${this.address}}. ${err}`,
      );
    }
  }

  override disposeAsync(): Promise<void> {
    this.internalDispose();
    return Promise.resolve();
  }

  protected override updateCachedReadings(): void {
    try {
      this.cachedReadings[ReadingType.temperature].push({
        metric: ReadingType.temperature,
        data: this.lastReading[ReadingType.temperature],
        units: this.units[ReadingType.temperature],
        logTime: this.lastReadingTime!.toISOString(),
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
      this.logger.error(`Failed to update cached readings for {DS18B20, id: ${this.id}}. ${err}`);
    }
  }

  protected override async loadCachedReadingsFromDatabaseAsync(minutes: number): Promise<void> {
    this.cachedReadings[ReadingType.temperature] = [];
    try {
      //Fill cached readings with readings from database
      const sdbReadings = await this.sprootDB.getSensorReadingsAsync(this, new Date(), minutes);
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
      this.logger.error(
        `Failed to load cached readings for sensor {DS18B20, id: ${this.id}}. ${err}}`,
      );
    }
  }

  static async getAddressesAsync(): Promise<string[]> {
    const data = await readFile("/sys/bus/w1/devices/w1_bus_master1/w1_master_slaves", "utf8");
    const parts = data.split("\n");
    parts.pop();
    return parts;
  }
}

async function readTemperatureFromDeviceAsync(address: string): Promise<number | false> {
  const data = await readFile(`/sys/bus/w1/devices/${address}/w1_slave`, "utf8");
  const lines = data.split("\n");
  if (lines[0]?.includes("YES")) {
    const output = lines[1]?.match(/t=(-?\d+)/);
    if (output) {
      const temperature = parseInt(output[1] || "");
      if (!isNaN(temperature)) {
        return temperature / 100 / 10;
      }
    }
  }
  return false;
}

export { DS18B20 };
