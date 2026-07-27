import bme280 from "bme280";
import { SDBSensor } from "@sproot/common/database/SDBSensor";
import { ISensorsRepository } from "../database/repositories/sensors/ISensorsRepository";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";
import winston from "winston";

class BME280 extends SensorBase {
  static readonly MAX_SENSOR_READ_TIME = 3500;

  static createInstanceAsync(
    sdbsensor: SDBSensor,
    sensorsRepository: ISensorsRepository,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ): Promise<BME280 | null> {
    const sensor = new BME280(
      sdbsensor,
      sensorsRepository,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
      logger,
    );
    return sensor.initializeAsync(BME280.MAX_SENSOR_READ_TIME);
  }

  private constructor(
    sdbsensor: SDBSensor,
    sensorsRepository: ISensorsRepository,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ) {
    super(
      sdbsensor,
      sensorsRepository,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
      [ReadingType.humidity, ReadingType.temperature, ReadingType.pressure],
      logger,
    );
  }

  override async takeReadingAsync(): Promise<void> {
    let sensor: bme280.Bme280 | null = null;
    const profiler = this.logger.startTimer();
    try {
      sensor = await bme280.open({
        i2cBusNumber: 1,
        i2cAddress: Number(this.address),
      });
      const reading = await sensor.read();
      this.lastReading[ReadingType.temperature] = String(reading.temperature);
      this.lastReading[ReadingType.humidity] = String(reading.humidity);
      this.lastReading[ReadingType.pressure] = String(reading.pressure);
      this.lastReadingTime = new Date();
    } catch (err) {
      this.logger.error(`Failed to read BME280 sensor ${this.id}. ${err}`);
    } finally {
      if (sensor !== null) {
        await sensor.close();
      }
    }
    profiler.done({
      message: `Reading time for sensor {BME280, id: ${this.id}, address: ${this.address}`,
      level: "debug",
    });
  }
}

export { BME280 };
