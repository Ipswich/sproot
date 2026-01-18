import { readFile } from "node:fs/promises";
import winston from "winston";

import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";

class DS18B20 extends SensorBase {
  static readonly MAX_SENSOR_READ_TIME = 3500;

  static createInstanceAsync(
    sdbSensor: SDBSensor,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ): Promise<DS18B20 | null> {
    return new DS18B20(
      sdbSensor,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger,
    ).initializeAsync(DS18B20.MAX_SENSOR_READ_TIME);
  }

  private constructor(
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

  override async takeReadingAsync(): Promise<void> {
    const profiler = this.logger.startTimer();
    try {
      const result = await DS18B20.readTemperatureFromDeviceAsync(this.address!);
      if (result === false) {
        throw new Error("Invalid reading from sensor.");
      }
      this.lastReading[ReadingType.temperature] = String(result);
      this.lastReadingTime = new Date();
    } catch (err) {
      this.logger.error(
        `Failed to get reading for sensor {DS18B20, id: ${this.id}, address: ${this.address}}. ${err}`,
      );
    } finally {
      profiler.done({
        message: `Reading time for sensor {DS18B20, id: ${this.id}, address: ${this.address}}`,
        level: "debug",
      });
    }
  }

  static async getAddressesAsync(): Promise<string[]> {
    const data = await readFile("/sys/bus/w1/devices/w1_bus_master1/w1_master_slaves", "utf8");
    const parts = data.split("\n");
    parts.pop();
    return parts.filter((part) => part.substring(0, 2) === "28");
  }

  static async readTemperatureFromDeviceAsync(address: string): Promise<number | false> {
    const data = await readFile(`/sys/bus/w1/devices/${address}/w1_slave`, "utf8");
    const lines = data.split("\n");
    if (lines[0] && lines[0].includes("YES")) {
      const output = lines[1]?.match(/t=(-?\d+)/);
      if (output && output[1] != null) {
        const temperatureRaw = parseInt(output[1], 10);
        return temperatureRaw / 1000;
      }
    }
    return false;
  }
}

export { DS18B20 };
