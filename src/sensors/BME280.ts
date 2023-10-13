import bme280, { Bme280 } from "bme280";
import { SDBSensor } from "../database/types/SDBSensor";
import { ISprootDB } from "../database/types/ISprootDB";
import { DisposableSensorBase, ReadingType } from "./types/SensorBase";

let lastStaticError: string | undefined = undefined;
class BME280 extends DisposableSensorBase {
  #bme280: Bme280;

  constructor(sdbsensor: SDBSensor, sprootDB: ISprootDB) {
    super(sdbsensor, sprootDB);
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
      handleError(err as Error);
    }
    return null;
  }

  override async disposeAsync(): Promise<void> {
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

function handleError(err: Error) {
  if (err?.message !== lastStaticError) {
    lastStaticError = err.message;
    if (err.message.includes("ENOENT: no such file or directory, open ")) {
      console.error(
        "Unable to connect to I2C driver. Please ensure your system has I2C support enabled.",
      );
    } else {
      console.error(err);
    }
  }
}

export { BME280 };
