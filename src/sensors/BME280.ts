import "dotenv/config";
import bme280, { Bme280 } from "bme280";
import { SDBSensor } from "../database/types/SDBSensor";
import { SDBReading } from "../database/types/SDBReading";
import { ISprootDB } from "../database/types/ISprootDB";
import { DisposableSensorBase, ReadingType } from "./types/SensorBase";
import winston from "winston";

let lastStaticError: string | undefined = undefined;
class BME280 extends DisposableSensorBase {
  #bme280: Bme280;

  constructor(
    sdbsensor: SDBSensor,
    sprootDB: ISprootDB,
    logger: winston.Logger,
  ) {
    super(sdbsensor, sprootDB, logger);
    this.#bme280 = {} as Bme280;
    this.units[ReadingType.temperature] = "°C";
    this.units[ReadingType.humidity] = "%rH";
    this.units[ReadingType.pressure] = "hPa";
    this.cachedReadings[ReadingType.temperature] = [];
    this.cachedReadings[ReadingType.humidity] = [];
    this.cachedReadings[ReadingType.pressure] = [];
  }

  async initAsync(): Promise<BME280 | null> {
    try {
      await this.loadCachedReadingsFromDatabaseAsync(
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!),
      );
      this.#bme280 = await bme280.open({
        i2cBusNumber: 1,
        i2cAddress: Number(this.address),
      });
      return this;
    } catch (err) {
      handleError(err as Error, this.logger);
    }
    return null;
  }

  override async disposeAsync(): Promise<void> {
    this.logger.info(`Disposing of BME280 sensor ${this.id}`);
    await this.#bme280.close();
  }

  override async getReadingAsync(): Promise<void> {
    const reading = await this.#bme280.read();
    this.lastReading[ReadingType.temperature] = String(reading.temperature);
    this.lastReading[ReadingType.humidity] = String(reading.humidity);
    this.lastReading[ReadingType.pressure] = String(reading.pressure);
    this.lastReadingTime = new Date();
  }

  protected override updateCachedReadings() {
    try {
      this.cachedReadings[ReadingType.temperature].push({
        metric: ReadingType.temperature,
        data: this.lastReading[ReadingType.temperature],
        units: this.units[ReadingType.temperature],
        logTime: new Date().toUTCString(),
      } as SDBReading);
      this.cachedReadings[ReadingType.humidity].push({
        metric: ReadingType.humidity,
        data: this.lastReading[ReadingType.humidity],
        units: this.units[ReadingType.humidity],
        logTime: new Date().toUTCString(),
      } as SDBReading);
      this.cachedReadings[ReadingType.pressure].push({
        metric: ReadingType.pressure,
        data: this.lastReading[ReadingType.pressure],
        units: this.units[ReadingType.pressure],
        logTime: new Date().toUTCString(),
      } as SDBReading);

      while (
        this.cachedReadings[ReadingType.temperature].length >
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!)
      ) {
        this.cachedReadings[ReadingType.temperature].shift();
      }
      while (
        this.cachedReadings[ReadingType.humidity].length >
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!)
      ) {
        this.cachedReadings[ReadingType.humidity].shift();
      }
      while (
        this.cachedReadings[ReadingType.pressure].length >
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!)
      ) {
        this.cachedReadings[ReadingType.pressure].shift();
      }
      this.logger.info(
        `Updated cached readings for {BME280, id: ${
          this.id
        }}. Cache Size - temperature: ${
          this.cachedReadings[ReadingType.temperature].length
        }, humidity: ${
          this.cachedReadings[ReadingType.humidity].length
        }, pressure: ${this.cachedReadings[ReadingType.pressure].length}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to update cache readings for {BME280, id: ${this.id}}`,
      );
      this.logger.error("BME280: " + err);
    }
  }

  protected override async loadCachedReadingsFromDatabaseAsync(
    count: number,
  ): Promise<void> {
    this.cachedReadings[ReadingType.temperature] = [];
    this.cachedReadings[ReadingType.humidity] = [];
    this.cachedReadings[ReadingType.pressure] = [];
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
          units: sdbReading.units,
          logTime: sdbReading.logTime,
        } as SDBReading;
        this.cachedReadings[sdbReading.metric as ReadingType]?.push(newReading);
        loadedReadingsCount[sdbReading.metric as ReadingType] =
          (loadedReadingsCount[sdbReading.metric as ReadingType] ?? 0) + 1;
      }

      this.logger.info(
        `Loaded cached readings for {BME280, id: ${
          this.id
        }}. Cache Size - temperature: ${
          this.cachedReadings[ReadingType.temperature].length
        }, humidity: ${
          this.cachedReadings[ReadingType.humidity].length
        }, pressure: ${this.cachedReadings[ReadingType.pressure].length}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to load cached readings for sensor {BME280, id:${this.id}}`,
      );
      this.logger.error("BME280: " + err);
    }
  }
}

function handleError(err: Error, logger: winston.Logger): Error {
  if (err?.message !== lastStaticError) {
    lastStaticError = err.message;
    if (err.message.includes("ENOENT: no such file or directory, open ")) {
      logger.error(
        "Unable to connect to I2C driver. Please ensure your system has I2C support enabled.",
      );
    } else {
      logger.error("BME280: " + err);
    }
  }
  return err;
}

export { BME280 };
