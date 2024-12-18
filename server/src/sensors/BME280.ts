import bme280 from "bme280";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";
import winston from "winston";

class BME280 extends SensorBase {
  readonly MAX_SENSOR_READ_TIME = 3500;
  constructor(
    sdbsensor: SDBSensor,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    super(
      sdbsensor,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      [ReadingType.humidity, ReadingType.temperature, ReadingType.pressure],
      logger,
    );
  }

  override async initAsync(): Promise<BME280 | null> {
    return this.createSensorAsync("BME280", this.MAX_SENSOR_READ_TIME);
  }

  override async takeReadingAsync(): Promise<void> {
    const profiler = this.logger.startTimer();
    await bme280
      .open({
        i2cBusNumber: 1,
        i2cAddress: Number(this.address),
      })
      .then(async (sensor) => {
        const reading = await sensor.read();
        this.lastReading[ReadingType.temperature] = String(reading.temperature);
        this.lastReading[ReadingType.humidity] = String(reading.humidity);
        this.lastReading[ReadingType.pressure] = String(reading.pressure);
        this.lastReadingTime = new Date();
        await sensor.close();
      })
      .catch((err) => {
        this.logger.error(`Failed to read BME280 sensor ${this.id}. ${err}`);
      });
    profiler.done({
      message: `Reading time for sensor {BME280, id: ${this.id}, address: ${this.address}`,
      level: "debug",
    });
  }

  override disposeAsync(): Promise<void> {
    this.internalDispose();
    return Promise.resolve();
  }
}

export { BME280 };
