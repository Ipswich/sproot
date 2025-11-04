import { openPromisified, PromisifiedBus } from "i2c-bus";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SensorBase } from "./base/SensorBase";
import winston from "winston";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";

export class ADS1115 extends SensorBase {
  static readonly MAX_SENSOR_READ_TIME = 3500;
  readonly gain: "2/3" | "1" | "2" | "4" | "8" | "16";
  constructor(
    sdbSensor: SDBSensor,
    readingType: ReadingType,
    gain: "2/3" | "1" | "2" | "4" | "8" | "16",
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
      [readingType],
      logger,
    );
    this.gain = gain;
  }

  override async initAsync(): Promise<ADS1115 | null> {
    return this.createSensorAsync(ADS1115.MAX_SENSOR_READ_TIME);
  }

  override async [Symbol.asyncDispose](): Promise<void> {
    return this.internalDispose();
  }

  override async takeReadingAsync(): Promise<void> {
    try {
      const reading = await this.getReadingFromDeviceAsync();
      this.lastReading[ReadingType.voltage] = Ads1115Device.computeVoltage(
        reading,
        this.gain,
      ).toString();
      this.lastReadingTime = new Date();
    } catch (error) {
      this.logger.error(`Failed to read ADS1115 sensor ${this.id}. ${error}`);
    }
  }

  protected async getReadingFromDeviceAsync(): Promise<number> {
    if (this.pin == null || !(this.pin in ["0", "1", "2", "3"])) {
      throw new Error(`Invalid pin: ${this.pin}. Must be one of '0', '1', '2', or '3'.`);
    }

    const mux = `${this.pin}+GND` as
      | "0+1"
      | "0+3"
      | "1+3"
      | "2+3"
      | "0+GND"
      | "1+GND"
      | "2+GND"
      | "3+GND";
    const calculatedGain = (this.gain as "2/3" | "1" | "2" | "4" | "8" | "16") ?? undefined;
    return Ads1115Device.getReadingAsync(Number(this.address), mux, calculatedGain);
  }
}

/**
 * The smart bits - this handles all of the communication with the ADS1115 chip.
 */
export class Ads1115Device {
  public static MEASUREMENT_SAMPLE_COUNT = 5;
  public static sleep = (t: number) => new Promise((resolve) => setTimeout(resolve, t));

  public static START_CONVERSION: number = 0b1000000000000000;
  public static MUX: Record<
    "0+1" | "0+3" | "1+3" | "2+3" | "0+GND" | "1+GND" | "2+GND" | "3+GND",
    number
  > = {
    "0+1": 0b0000000000000000,
    "0+3": 0b0001000000000000,
    "1+3": 0b0010000000000000,
    "2+3": 0b0011000000000000,
    "0+GND": 0b0100000000000000,
    "1+GND": 0b0101000000000000,
    "2+GND": 0b0110000000000000,
    "3+GND": 0b0111000000000000,
  };

  public static gains: Record<"2/3" | "1" | "2" | "4" | "8" | "16", number> = {
    "2/3": 0b0000000000000000, // +/- 6.144V
    "1": 0b0000001000000000, // +/- 4.096V
    "2": 0b0000010000000000, // +/- 2.048V
    "4": 0b0000011000000000, // +/- 1.024V
    "8": 0b0000100000000000, // +/- 0.512V
    "16": 0b0000101000000000, // +/- 0.256V
  };

  public static async openAsync(busNum: number, addr = 0x48) {
    return new Ads1115Device(await openPromisified(busNum), addr);
  }

  public static async getReadingAsync(
    address: number,
    mux: keyof typeof Ads1115Device.MUX,
    gain: keyof typeof Ads1115Device.gains,
  ) {
    await using device = await Ads1115Device.openAsync(1, address);
    return await device.measureAsync(mux, gain);
  }

  private static addressQueues: Map<number, Promise<unknown>> = new Map();

  #gain: number = Ads1115Device.gains["1"];
  #bus: PromisifiedBus;
  #addr: number;
  #delay: number;
  #shift: number;

  constructor(bus: PromisifiedBus, addr = 0x48, delay = 15, shift = 0) {
    this.#bus = bus;
    this.#addr = addr;
    this.#delay = delay;
    this.#shift = shift;
  }

  get gain(): Number {
    return this.#gain;
  }
  set gain(level: "2/3" | "1" | "2" | "4" | "8" | "16") {
    this.#gain = Ads1115Device.gains[level];
  }

  writeReg16Async(register: number, value: number) {
    const buff = Buffer.from([register & 3, value >> 8, value & 0xff]);
    return this.#bus.i2cWrite(this.#addr, 3, buff);
  }

  async readReg16Async(register: number) {
    await this.#bus.i2cWrite(this.#addr, 1, Buffer.alloc(1, register));
    const buff = (await this.#bus.i2cRead(this.#addr, 2, Buffer.allocUnsafe(2))).buffer;
    if (buff.length !== 2) {
      throw new Error(
        `Invalid read length from register 0x${register.toString(16)}: ${buff.length}`,
      );
    }
    return (buff[0]! << 8) | buff[1]!;
  }

  async readResultsAsync() {
    return (await this.readReg16Async(0x00)) >> this.#shift;
  }

  writeConfigAsync(value: number) {
    return this.writeReg16Async(0b01, value);
  }

  async measureAsync(
    mux: "0+1" | "0+3" | "1+3" | "2+3" | "0+GND" | "1+GND" | "2+GND" | "3+GND",
    gain: "2/3" | "1" | "2" | "4" | "8" | "16" = "2/3",
  ) {
    const doMeasure = async () => {
      const muxValue = Ads1115Device.MUX[mux];
      if (typeof mux === "undefined") {
        throw new Error("ADS1115 measureAsync - Invalid mux");
      }
      const calculatedGain = Ads1115Device.gains[gain] ?? this.#gain;
      if (typeof calculatedGain === "undefined") {
        throw new Error("ADS1115 measureAsync - Invalid gain");
      }

      const config = 0x0183; // No comparator | 1600 samples per second | single-shot mode
      await this.writeConfigAsync(
        config | calculatedGain | muxValue | Ads1115Device.START_CONVERSION,
      );

      await Ads1115Device.sleep(this.#delay);
      return await this.readResultsAsync();
    };

    // Get the current queue for this address, or a resolved promise if none
    const prev = Ads1115Device.addressQueues.get(this.#addr) ?? Promise.resolve();
    // Chain the new measure onto the queue
    const next = prev.then(doMeasure, doMeasure);
    // Update the queue for this address
    Ads1115Device.addressQueues.set(
      this.#addr,
      next.catch(() => {}),
    );
    // Return the result of this measure
    return next;
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

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#bus.close();
  }
}
