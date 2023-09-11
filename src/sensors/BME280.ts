import bme280, { Bme280 } from 'bme280';
import { GDBSensor } from '../types/database-objects/GDBSensor';
import { IGrowthDB } from '../types/database-objects/IGrowthDB';
import { DisposableSensorBase, ReadingType } from '../types/SensorBase';


class BME280 extends DisposableSensorBase {
  #bme280: Bme280;

  constructor(gdbSensor: GDBSensor, growthDB: IGrowthDB) {
    super(gdbSensor, growthDB);
    this.#bme280 = {} as Bme280;
    this.units[ReadingType.temperature] = '°C';
    this.units[ReadingType.humidity] = '%rH';
    this.units[ReadingType.pressure] = 'hPa';
  }

  async initAsync(): Promise<BME280> {
    this.#bme280 = await bme280.open({ i2cBusNumber: 1, i2cAddress: Number(this.address) });
    return this;
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

export { BME280 };