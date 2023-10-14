import bme280, { Bme280 } from "bme280";
import { SDBSensor } from "../database/types/SDBSensor";
import { ISprootDB } from "../database/types/ISprootDB";
import { DisposableSensorBase, ReadingType } from "./types/SensorBase";
import winston from "winston";

let lastStaticError: string | undefined = undefined;
class BME280 extends DisposableSensorBase {
  #bme280: Bme280;

  constructor(
    sdbsensor: SDBSensor,
    sprootDB: ISprootDB,
    logger: winston.Logger,
  ) {
    super(sdbsensor, sprootDB, logger);
    this.#bme280 = {} as Bme280;
    this.units[ReadingType.temperature] = "°C";
    this.units[ReadingType.humidity] = "%rH";
    this.units[ReadingType.pressure] = "hPa";
  }

  async initAsync(): Promise<BME280 | null> {
    try {
      this.#bme280 = await bme280.open({
        i2cBusNumber: 1,
        i2cAddress: Number(this.address),
      });
      return this;
    } catch (err) {
      handleError(err as Error, this.logger);
    }
    return null;
  }

  override async disposeAsync(): Promise<void> {
    this.logger.info(`Disposing of BME280 sensor ${this.id}`);
    await this.#bme280.close();
  }

  override async getReadingAsync(): Promise<void> {
    const reading = await this.#bme280.read();
    this.lastReading[ReadingType.temperature] = String(reading.temperature);
    this.lastReading[ReadingType.humidity] = String(reading.humidity);
    this.lastReading[ReadingType.pressure] = String(reading.pressure);
    this.lastReadingTime = new Date();
  }
}

function handleError(err: Error, logger: winston.Logger) {
  if (err?.message !== lastStaticError) {
    lastStaticError = err.message;
    if (err.message.includes("ENOENT: no such file or directory, open ")) {
      logger.error(
        "Unable to connect to I2C driver. Please ensure your system has I2C support enabled.",
      );
    } else {
      logger.error(err);
    }
  }
}

export { BME280 };
