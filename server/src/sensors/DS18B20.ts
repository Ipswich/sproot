import { readFile } from "node:fs/promises";
import winston from "winston";

import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";

class DS18B20 extends SensorBase {
  readonly MAX_SENSOR_READ_TIME = 3500;

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

  override async initAsync(): Promise<DS18B20 | null> {
    return this.createSensorAsync(this.MAX_SENSOR_READ_TIME);
  }

  override async takeReadingAsync(): Promise<void> {
    const profiler = this.logger.startTimer();
    await readTemperatureFromDeviceAsync(this.address!)
      .then(async (result) => {
        if (result === false) {
          throw new Error("Invalid reading from sensor.");
        }
        const reading = String(result);
        this.lastReading[ReadingType.temperature] = reading;
        this.lastReadingTime = new Date();
      })
      .catch((err) => {
        this.logger.error(
          `Failed to get reading for sensor {DS18B20, id: ${this.id}, address: ${this.address}}. ${err}`,
        );
      });
    profiler.done({
      message: `Reading time for sensor {DS18B20, id: ${this.id}, address: ${this.address}`,
      level: "debug",
    });
  }

  override disposeAsync(): Promise<void> {
    this.internalDispose();
    return Promise.resolve();
  }

  static async getAddressesAsync(): Promise<string[]> {
    const data = await readFile("/sys/bus/w1/devices/w1_bus_master1/w1_master_slaves", "utf8");
    const parts = data.split("\n");
    parts.pop();
    return parts.filter((part) => part.substring(0, 2) === "28");
  }
}

async function readTemperatureFromDeviceAsync(address: string): Promise<number | false> {
  const data = await readFile(`/sys/bus/w1/devices/${address}/w1_slave`, "utf8");
  const lines = data.split("\n");
  if (lines[0]?.includes("YES")) {
    const output = lines[1]?.match(/t=(-?\d+)/);
    if (output && output[1] != null) {
      const temperature = parseInt(output[1]);
      return temperature / 100 / 10;
    }
  }
  return false;
}

export { DS18B20 };
