import ds18b20 from 'ds18b20';
import util from 'util';

import { SDBSensor } from '../database/types/SDBSensor';
import { ISprootDB } from '../database/types/ISprootDB';
import { SensorBase, ReadingType } from './types/SensorBase';

class DS18B20 extends SensorBase {

  constructor(gdbSensor: SDBSensor, sprootDB: ISprootDB) {
    super(gdbSensor, sprootDB);
    this.units[ReadingType.temperature] = '°C';
  }
  
  override async getReadingAsync(): Promise<void> {
    this.lastReading[ReadingType.temperature] = String(await util.promisify(ds18b20.temperature)(this.address!));
    this.lastReadingTime = new Date();
  }

  static async getAddressesAsync(): Promise<string[]> {
    return await util.promisify(ds18b20.sensors)();
  }
}

export { DS18B20 };