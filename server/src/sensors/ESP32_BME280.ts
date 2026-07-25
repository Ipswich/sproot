import { SDBSensor } from "@sproot/common/dist/database/SDBSensor";
import { MdnsService } from "../system/MdnsService";
import { ISensorsRepository } from "@sproot/common/dist/database/sensors/ISensorsRepository";
import { ReadingType } from "@sproot/common/dist/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";
import winston from "winston";
import { SDBSubcontroller } from "@sproot/common/dist/database/SDBSubcontroller";

class ESP32_BME280 extends SensorBase {
  static readonly MAX_SENSOR_READ_TIME = 3500;
  #mdnsService: MdnsService;
  subcontroller: SDBSubcontroller;

  static createInstanceAsync(
    sdbsensor: SDBSensor,
    subcontroller: SDBSubcontroller,
    sensorsRepository: ISensorsRepository,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ): Promise<ESP32_BME280 | null> {
    const sensor = new ESP32_BME280(
      sdbsensor,
      subcontroller,
      sensorsRepository,
      mdnsService,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
      logger,
    );
    return sensor.initializeAsync(ESP32_BME280.MAX_SENSOR_READ_TIME);
  }

  private constructor(
    sdbsensor: SDBSensor,
    subcontroller: SDBSubcontroller,
    sensorsRepository: ISensorsRepository,
    mdnsService: MdnsService,
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

    this.#mdnsService = mdnsService;
    this.subcontroller = subcontroller;
  }

  override async takeReadingAsync(): Promise<void> {
    const profiler = this.logger.startTimer();
    try {
      const ipAddress = this.#mdnsService.getIPAddressByHostName(this.subcontroller.hostName);
      if (ipAddress == null) {
        throw new Error(
          `Could not resolve IP address for host name: ${this.subcontroller.hostName}`,
        );
      }
      this.lastReadingTime = new Date();
      const response = await fetch(`http://${ipAddress}/api/sensors/bme280/${this.address}`, {
        method: "GET",
      });
      if (response.ok) {
        const readings = ((await response.json()) as ESP32_BME280Response).readings;
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
      this.logger.error(`Failed to read ESP32_BME280 sensor ${this.id}. ${err}`);
    }
    profiler.done({
      message: `Reading time for sensor {ESP32_BME280, id: ${this.id}, address: ${this.address}`,
      level: "debug",
    });
  }
}

interface ESP32_BME280Response {
  readings: {
    temperature: number;
    humidity: number;
    pressure: number;
  };
}

export { ESP32_BME280 };
