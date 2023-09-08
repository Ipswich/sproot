import ds18b20 from 'ds18b20';
import util from 'util';

import { GDBSensor } from '../types/database-objects/GDBSensor';
import { IGrowthDB } from '../types/database-objects/IGrowthDB';
import { SensorBase, ReadingType } from '../types/SensorBase';

class DS18B20 extends SensorBase {

  constructor(gdbSensor: GDBSensor, growthDB: IGrowthDB) {
    super(gdbSensor, growthDB);
    this.units[ReadingType.temperature] = '°C';
  }
  
  override async getReadingAsync(): Promise<void> {
    this.lastReading[ReadingType.temperature] = String(await util.promisify(ds18b20.temperature)(this.address!));
  }

  static async getAddressesAsync(): Promise<string[]> {
    return await util.promisify(ds18b20.sensors)();
  }
}

export { DS18B20 };