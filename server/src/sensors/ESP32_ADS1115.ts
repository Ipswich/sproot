import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { MdnsService } from "../system/MdnsService";
import { SensorBase } from "./base/SensorBase";
import winston from "winston";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SDBSubcontroller } from "@sproot/sproot-common/dist/database/SDBSubcontroller";

export class ESP32_ADS1115 extends SensorBase {
  static readonly MAX_SENSOR_READ_TIME = 3500;
  readonly gain: "2/3" | "1" | "2" | "4" | "8" | "16";
  #mdnsService: MdnsService;
  subcontroller: SDBSubcontroller;
  constructor(
    sdbSensor: SDBSensor,
    subcontroller: SDBSubcontroller,
    readingType: ReadingType,
    gain: "2/3" | "1" | "2" | "4" | "8" | "16",
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
      [readingType],
      logger,
    );
    this.gain = gain;
    this.#mdnsService = mdnsService;
    this.subcontroller = subcontroller;
  }

  override async initAsync(): Promise<ESP32_ADS1115 | null> {
    return this.createSensorAsync(ESP32_ADS1115.MAX_SENSOR_READ_TIME);
  }

  override async [Symbol.asyncDispose](): Promise<void> {
    return this.internalDispose();
  }

  override async takeReadingAsync(): Promise<void> {
    try {
      const reading = await this.getReadingFromDeviceAsync();
      this.lastReading[ReadingType.voltage] = (reading / 10000).toString();
      this.lastReadingTime = new Date();
    } catch (error) {
      this.logger.error(`Failed to read ESP32_ADS1115 sensor ${this.id}. ${error}`);
    }
  }

  protected async getReadingFromDeviceAsync(): Promise<number> {
    if (this.pin == null || !(this.pin in ["0", "1", "2", "3"])) {
      throw new Error(`Invalid pin: ${this.pin}. Must be one of '0', '1', '2', or '3'.`);
    }
    const ipAddress = this.#mdnsService.getIPAddressByHostName(this.subcontroller.hostName);
    if (ipAddress == null) {
      throw new Error(`Could not resolve IP address for host name: ${this.subcontroller.hostName}`);
    }
    const calculatedGain = (this.gain as "2/3" | "1" | "2" | "4" | "8" | "16") ?? undefined;
    const response = await fetch(
      `http://${ipAddress}/api/sensors/ads1115/${this.address}/${this.pin}?gain=${calculatedGain}`,
      {
        method: "GET",
      },
    );
    if (response.ok) {
      const readings = ((await response.json()) as ESP32_ADS1115Response).readings;
      return readings.voltage;
    } else {
      throw new Error(`Invalid response from sensor: ${response.status} ${response.statusText}`);
    }
  }
}

export interface ESP32_ADS1115Response {
  readings: {
    channel: number;
    raw: number;
    voltage: number;
  };
}
