import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { MdnsService } from "../system/MdnsService";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";
import winston from "winston";

class ESP32_BME280 extends SensorBase {
  readonly MAX_SENSOR_READ_TIME = 3500;
  constructor(
    sdbsensor: SDBSensor,
    sprootDB: ISprootDB,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    super(
      sdbsensor,
      sprootDB,
      mdnsService,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      [ReadingType.humidity, ReadingType.temperature, ReadingType.pressure],
      logger,
    );
  }

  override async initAsync(): Promise<ESP32_BME280 | null> {
    return this.createSensorAsync(this.MAX_SENSOR_READ_TIME);
  }

  override async takeReadingAsync(): Promise<void> {
    const profiler = this.logger.startTimer();
    try {
      const ipAddress = this.mdnsService.getIPAddressByHostName(this.hostName);
      if (ipAddress == null) {
        throw new Error(`Could not resolve IP address for host name: ${this.hostName}`);
      }
      this.lastReadingTime = new Date();
      const response = await fetch(`http://${ipAddress}/api/sensors/bme280/${this.address}`, {
        method: "GET",
      });
      if (response.ok) {
        const readings = (await response.json()) as ESP32_BME280Response;
        this.lastReading[ReadingType.temperature] = String(readings.temperature);
        this.lastReading[ReadingType.humidity] = String(readings.humidity);
        this.lastReading[ReadingType.pressure] = String(readings.pressure);
      } else {
        throw new Error(`Invalid response from sensor: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      this.lastReading[ReadingType.temperature] = undefined;
      this.lastReading[ReadingType.humidity] = undefined;
      this.lastReading[ReadingType.pressure] = undefined;
      this.logger.error(`Failed to read BME280 sensor ${this.id}. ${err}`);
    }
    profiler.done({
      message: `Reading time for sensor {BME280, id: ${this.id}, address: ${this.address}`,
      level: "debug",
    });
  }

  override [Symbol.asyncDispose](): Promise<void> {
    this.internalDispose();
    return Promise.resolve();
  }
}

interface ESP32_BME280Response {
  temperature: number;
  humidity: number;
  pressure: number;
}

export { ESP32_BME280 };
