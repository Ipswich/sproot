import winston from "winston";

import { SDBSensor } from "@sproot/common/database/SDBSensor";
import { ISensorsRepository } from "../database/repositories/sensors/ISensorsRepository";
import { MdnsService } from "../system/MdnsService";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";
import { SDBSubcontroller } from "@sproot/common/database/SDBSubcontroller";

class ESP32_DS18B20 extends SensorBase {
  static readonly MAX_SENSOR_READ_TIME = 3500;
  #mdnsService: MdnsService;
  subcontroller: SDBSubcontroller;

  static createInstanceAsync(
    sdbSensor: SDBSensor,
    subcontroller: SDBSubcontroller,
    sensorsRepository: ISensorsRepository,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ): Promise<ESP32_DS18B20 | null> {
    const sensor = new ESP32_DS18B20(
      sdbSensor,
      subcontroller,
      sensorsRepository,
      mdnsService,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
      logger,
    );
    return sensor.initializeAsync(ESP32_DS18B20.MAX_SENSOR_READ_TIME);
  }

  private constructor(
    sdbSensor: SDBSensor,
    subcontroller: SDBSubcontroller,
    sensorsRepository: ISensorsRepository,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ) {
    super(
      sdbSensor,
      sensorsRepository,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
      [ReadingType.temperature],
      logger,
    );
    this.#mdnsService = mdnsService;
    this.subcontroller = subcontroller;
  }

  override async takeReadingAsync(): Promise<void> {
    const profiler = this.logger.startTimer();
    try {
      const ipAddress = this.#mdnsService.getIPAddressByHostName(this.subcontroller.hostName);
      if (!ipAddress) {
        throw new Error(
          `Could not resolve IP address for host name: ${this.subcontroller.hostName}`,
        );
      }
      const addr = this.address;
      if (!addr) throw new Error("Missing sensor address");
      const result = await readTemperatureFromDeviceAsync(ipAddress, addr);
      if (result === false || isNaN(result)) throw new Error("Invalid reading from sensor.");
      this.lastReading[ReadingType.temperature] = String(result);
      this.lastReadingTime = new Date();
    } catch (err) {
      this.logger.error(
        `Failed to get reading for sensor {ESP32_DS18B20, id: ${this.id}, address: ${this.address}}. ${err}`,
      );
    }
    profiler.done({
      message: `Reading time for sensor {ESP32_DS18B20, id: ${this.id}, address: ${this.address}}`,
      level: "debug",
    });
  }

  static async getAddressesAsync(hostName: string): Promise<string[]> {
    try {
      const data = await fetchJson<ESP32_DS18B20AddressesResponse>(
        `http://${hostName}/api/sensors/ds18b20/addresses`,
      );
      return data?.addresses ?? [];
    } catch (error) {
      return [];
    }
  }
}

async function readTemperatureFromDeviceAsync(
  externalAddress: string,
  address: string,
): Promise<number | false> {
  const data = await fetchJson<ESP32_DS18B20ReadingResponse>(
    `http://${externalAddress}/api/sensors/ds18b20/${address}`,
  );
  return data?.temperature ?? false;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
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
