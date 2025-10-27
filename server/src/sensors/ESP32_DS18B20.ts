import winston from "winston";

import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";

class ESP32_DS18B20 extends SensorBase {
  readonly MAX_SENSOR_READ_TIME = 3500;
  static deviceRecord: Record<string, string[]> = {};

  constructor(
    sdbSensor: SDBSensor,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    super(
      sdbSensor,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      [ReadingType.temperature],
      logger,
    );
  }

  override async initAsync(): Promise<ESP32_DS18B20 | null> {
    const sensor = await this.createSensorAsync(this.MAX_SENSOR_READ_TIME);
    if (sensor && this.externalAddress != null && this.address != null) {
      if (ESP32_DS18B20.deviceRecord[this.externalAddress] == null) {
        ESP32_DS18B20.deviceRecord[this.externalAddress] = [];
      }
      if (!ESP32_DS18B20.deviceRecord[this.externalAddress]?.includes(this.address)) {
        ESP32_DS18B20.deviceRecord[this.externalAddress]?.push(this.address);
      }
    }

    return sensor;
  }

  override async takeReadingAsync(): Promise<void> {
    const profiler = this.logger.startTimer();
    try {
      const result = await readTemperatureFromDeviceAsync(this.externalAddress!, this.address!);
      if (result === false || isNaN(result)) {
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
    profiler.done({
      message: `Reading time for sensor {DS18B20, id: ${this.id}, address: ${this.address}`,
      level: "debug",
    });
  }

  override [Symbol.asyncDispose](): Promise<void> {
    this.internalDispose();
    if (ESP32_DS18B20.deviceRecord[this.externalAddress!]?.includes(this.address!)) {
      const index = ESP32_DS18B20.deviceRecord[this.externalAddress!]?.indexOf(this.address!);
      if (index != null && index > -1) {
        ESP32_DS18B20.deviceRecord[this.externalAddress!]?.splice(index, 1);
      }
      if (ESP32_DS18B20.deviceRecord[this.externalAddress!]?.length === 0) {
        delete ESP32_DS18B20.deviceRecord[this.externalAddress!];
      }
    }
    return Promise.resolve();
  }

  static async getAddressesAsync(externalAddress: string): Promise<string[]> {
    try {
      const response = await fetch(`${externalAddress}/api/sensors/ds18b20/addresses`, {
        method: "GET",
      });
      if (response.ok) {
        const data = (await response.json()) as ESP32_DS18B20AddressesResponse;
        return data.addresses;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }
}

async function readTemperatureFromDeviceAsync(
  externalAddress: string,
  address: string,
): Promise<number | false> {
  const response = await fetch(`${externalAddress}/api/sensors/ds18b20/${address}`, {
    method: "GET",
  });
  if (response.ok) {
    const data = (await response.json()) as ESP32_DS18B20ReadingResponse;
    return data.temperature / 1000;
  } else {
    return false;
  }
}

interface ESP32_DS18B20ReadingResponse {
  temperature: number;
  address: string;
}

interface ESP32_DS18B20AddressesResponse {
  addresses: string[];
}

export { ESP32_DS18B20 };
