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
  }

  async initAsync(): Promise<BME280 | null> {
    try {
      await this.loadCachedReadingsAsync();
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

    
    if (this.cachedReadings[ReadingType.temperature].length > 0) {
      this.cachedReadings[ReadingType.temperature].shift();
      this.cachedReadings[ReadingType.temperature].push({metric: ReadingType.temperature, data: String(reading.temperature), unit: this.units[ReadingType.temperature], logTime: new Date().toUTCString()} as SDBReading);
    }
    if(this.cachedReadings[ReadingType.humidity].length > 0){
      this.cachedReadings[ReadingType.humidity].shift();
      this.cachedReadings[ReadingType.humidity].push({metric: ReadingType.humidity, data: String(reading.humidity), unit: this.units[ReadingType.humidity], logTime: new Date().toUTCString()} as SDBReading);
    }
    if(this.cachedReadings[ReadingType.pressure].length > 0){
      this.cachedReadings[ReadingType.pressure].shift();
      this.cachedReadings[ReadingType.pressure].push({metric: ReadingType.pressure, data: String(reading.pressure), unit: this.units[ReadingType.pressure], logTime: new Date().toUTCString()} as SDBReading);
    }
  }

  protected override async loadCachedReadingsAsync(): Promise<void> {
    try {
      //Fill cached readings with readings from database
      const sdbReadings = await this.sprootDB.getSensorReadingsAsync(this, new Date(), Number(process.env["MAX_SENSOR_READINGS_CACHE_SIZE"]!));
      for (const sdbReading of sdbReadings) {
        const newReading = {metric: sdbReading.metric as ReadingType, data: sdbReading.data, unit: sdbReading.unit, logTime: sdbReading.logTime} as SDBReading;
        if (!this.cachedReadings[sdbReading.metric as ReadingType]) {
          this.cachedReadings[sdbReading.metric as ReadingType] = [];
        }
        this.cachedReadings[sdbReading.metric as ReadingType]?.push(newReading);
      }
    } catch (err) {
      this.logger.error(`Failed to load cached readings for sensor ${this.id}`);
      this.logger.error(err);
    }
  }
}

function handleError(err: Error, logger: winston.Logger) {
  if (err?.message !== lastStaticError) {
    lastStaticError = err.message;
    if (err.message.includes("ENOENT: no such file or directory, open ")) {
      logger.error(
        "Unable to connect to I2C driver. Please ensure your system has I2C support enabled.",
      );
    } else {
      logger.error(err);
    }
  }
}

export { BME280 };
