import bme280 from 'bme280';

import { Bme280 } from 'bme280';
import { GDBSensor } from '../types/database-objects/GDBSensor';
import { GrowthDB } from '../GrowthDB';
import { SensorBase, ReadingType } from '../types/SensorBase';


class BME280 extends SensorBase {
  bme280: Bme280;

  constructor(gdbSensor: GDBSensor, growthDB: GrowthDB) {
    super(gdbSensor, growthDB);
    this.bme280 = {} as Bme280;
  }

  async init(): Promise<BME280> {
    this.bme280 = await bme280.open({ i2cBusNumber: 1, i2cAddress: Number(this.address) });
    return this;
  }

  async dispose(): Promise<void> {
    await this.bme280.close();
  }

  async getReading(): Promise<void> {
    const reading = await this.bme280.read();
    this.lastReading[ReadingType.temperature] = String(reading.temperature);
    this.lastReading[ReadingType.humidity] = String(reading.humidity);
    this.lastReading[ReadingType.pressure] = String(reading.pressure);
    this.lastReadingTime = new Date();
  }

  async addLastReadingToDatabase(): Promise<void> {
    this.growthDB.addSensorReading(this);
  }

  getUnits(readingType: ReadingType): string {
      switch (readingType){
        case ReadingType.temperature:
          return '°C';
        case ReadingType.humidity:
          return '%rH';
        case ReadingType.pressure:
          return 'hPa';
        default:
          return ' - ';
      }
  }
}

export { BME280 };