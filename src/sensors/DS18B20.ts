import ds18b20 from 'ds18b20';
import util from 'util';

import { SDBSensor } from '../database/types/SDBSensor';
import { ISprootDB } from '../database/types/ISprootDB';
import { SensorBase, ReadingType } from './types/SensorBase';

class DS18B20 extends SensorBase {

  constructor(sdbSensor: SDBSensor, sprootDB: ISprootDB) {
    super(sdbSensor, sprootDB);
    this.units[ReadingType.temperature] = '°C';
  }
  
  override async getReadingAsync(): Promise<void> {
    try {
      this.lastReading[ReadingType.temperature] = String(await util.promisify(ds18b20.temperature)(this.address!));
      this.lastReadingTime = new Date();
    } catch (err) {
      console.error(err);
    }
  }

  static async getAddressesAsync(): Promise<string[]> {
    try {
      return await util.promisify(ds18b20.sensors)();
    }
    catch (err) {
      console.error(err);
      return [];
    }
  }
}

export { DS18B20 };