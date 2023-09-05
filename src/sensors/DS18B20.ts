import ds18b20 from 'ds18b20';
import util from 'util';

import { GDBSensor } from '../types/database-objects/GDBSensor';
import { GrowthDB } from '../GrowthDB';
import { SensorBase, ReadingType } from '../types/SensorBase';

class DS18B20 extends SensorBase {

  constructor(gdbSensor: GDBSensor, growthDB: GrowthDB) {
    super(gdbSensor, growthDB);
  }
  
  override async getReading(): Promise<void> {
    this.lastReading[ReadingType.temperature] = String(await util.promisify(ds18b20.temperature)(this.address!));
  }

  override async addLastReadingToDatabase(): Promise<void> {
    this.growthDB.addSensorReading(this);
  }

  async getAddresses(): Promise<string[]> {
    return await util.promisify(ds18b20.sensors)();
  }

  override getUnits(readingType: ReadingType): string {
    switch (readingType){
      case ReadingType.temperature:
        return '°C';
      default:
        return ' - ';
    }
  }
  
  static getAddresses(): Promise<string[]> {
    return util.promisify(ds18b20.sensors)();
  }
}


export { DS18B20 };