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

  static createInstanceAsync(
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
  ): Promise<ESP32_ADS1115 | null> {
    const sensor = new ESP32_ADS1115(
      sdbSensor,
      subcontroller,
      readingType,
      gain,
      sprootDB,
      mdnsService,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger,
    );
    return sensor.initializeAsync(ESP32_ADS1115.MAX_SENSOR_READ_TIME);
  }

  private constructor(
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

  override async takeReadingAsync(): Promise<void> {
    try {

      const ipAddress = this.#mdnsService.getIPAddressByHostName(this.subcontroller.hostName);
      if (ipAddress == null) {
        throw new Error(`Could not resolve IP address for host name: ${this.subcontroller.hostName}`);
      }
      const reading = await ESP32_Ads1115Device.getReadingFromDeviceAsync(this.pin, this.address!, ipAddress, this.gain);
      this.lastReading[ReadingType.voltage] = ESP32_Ads1115Device.computeVoltage(
        reading,
        this.gain,
      ).toString();
      this.lastReadingTime = new Date();
    } catch (error) {
      this.logger.error(`Failed to read ESP32_ADS1115 sensor ${this.id}. ${error}`);
    }
  }
}

export class ESP32_Ads1115Device {
  static async getReadingFromDeviceAsync(pin: string | null, deviceAddress: string, ipAddress: string, gain: string): Promise<number> {
    if (pin == null || !(pin in ["0", "1", "2", "3"])) {
      throw new Error(`Invalid pin: ${pin}. Must be one of '0', '1', '2', or '3'.`);
    }
    const calculatedGain = (gain as "2/3" | "1" | "2" | "4" | "8" | "16") ?? undefined;
    const response = await fetch(
      `http://${ipAddress}/api/sensors/ads1115/${deviceAddress}/${pin}?gain=${calculatedGain}`,
      {
        method: "GET",
      },
    );
    if (response.ok) {
      const readings = ((await response.json()) as ESP32_ADS1115Response).readings;
      return readings.raw;
    } else {
      throw new Error(`Invalid response from sensor: ${response.status} ${response.statusText}`);
    }
  }

  static computeVoltage(raw: number, gain: "2/3" | "1" | "2" | "4" | "8" | "16"): number {
    switch (gain) {
      case "2/3":
        return (raw * 6.144) / 32768;
      case "1":
        return (raw * 4.096) / 32768;
      case "2":
        return (raw * 2.048) / 32768;
      case "4":
        return (raw * 1.024) / 32768;
      case "8":
        return (raw * 0.512) / 32768;
      case "16":
        return (raw * 0.256) / 32768;
      default:
        throw new Error("Invalid gain value");
    }
  }
}

export interface ESP32_ADS1115Response {
  readings: {
    raw: number;
    voltage: number;
  };
}
