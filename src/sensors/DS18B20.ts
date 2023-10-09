import ds18b20 from 'ds18b20';
import util from 'util';

import { SDBSensor } from '../database/types/SDBSensor';
import { ISprootDB } from '../database/types/ISprootDB';
import { SensorBase, ReadingType } from './types/SensorBase';

let lastStaticError: string | undefined = undefined;
class DS18B20 extends SensorBase {
  lastError: string | undefined = undefined;
  
  constructor(sdbSensor: SDBSensor, sprootDB: ISprootDB) {
    super(sdbSensor, sprootDB);
    this.units[ReadingType.temperature] = '°C';
  }
  
  override async getReadingAsync(): Promise<void> {
    try {
      this.lastReading[ReadingType.temperature] = String(await util.promisify(ds18b20.temperature)(this.address!));
      this.lastReadingTime = new Date();
    } catch (err) {
      if (err instanceof Error) {
        if (err.message !== this.lastError){
          this.lastError = err.message;
          console.error(err);
        }
      }
    }
  }

  static async getAddressesAsync(): Promise<string[]> {
    try {
      return await util.promisify(ds18b20.sensors)();
    }
    catch (err) {
      if (err instanceof Error) {
        if (err.message !== lastStaticError){
          lastStaticError = err.message;
          console.error(err);
        }
      }
      return [];
    }
  }
}

export { DS18B20 };