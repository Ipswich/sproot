import winston from "winston";

import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { MdnsService } from "../system/MdnsService";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";
import { SDBSubcontroller } from "@sproot/sproot-common/dist/database/SDBSubcontroller";

class ESP32_DS18B20 extends SensorBase {
  readonly MAX_SENSOR_READ_TIME = 3500;
  #mdnsService: MdnsService;
  subcontroller: SDBSubcontroller;

  constructor(
    sdbSensor: SDBSensor,
    subcontroller: SDBSubcontroller,
    sprootDB: ISprootDB,
    mdnsService: MdnsService,
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
    this.#mdnsService = mdnsService;
    this.subcontroller = subcontroller;
  }

  override async initAsync(): Promise<ESP32_DS18B20 | null> {
    const sensor = await this.createSensorAsync(this.MAX_SENSOR_READ_TIME);
    return sensor;
  }

  override async takeReadingAsync(): Promise<void> {
    const profiler = this.logger.startTimer();
    try {
      const ipAddress = this.#mdnsService.getIPAddressByHostName(this.subcontroller!.hostName);
      if (ipAddress == null) {
        throw new Error(
          `Could not resolve IP address for host name: ${this.subcontroller!.hostName}`,
        );
      }
      const result = await readTemperatureFromDeviceAsync(ipAddress, this.address!);
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
    return Promise.resolve();
  }

  static async getAddressesAsync(hostName: string): Promise<string[]> {
    try {
      const response = await fetch(`http://${hostName}/api/sensors/ds18b20/addresses`, {
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
  const response = await fetch(`http://${externalAddress}/api/sensors/ds18b20/${address}`, {
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
