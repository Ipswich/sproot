import ds18b20 from 'ds18b20';
import util from 'util';

import { GDBSensor } from '../types/database-objects/GDBSensor';
import { GrowthDB } from '../GrowthDB';
import { SensorBase, ReadingType } from '../types/SensorBase';

class DS18B20 extends SensorBase {

  override getUnits(readingType: ReadingType): string {
    switch (readingType){
      case ReadingType.temperature:
        return '°C';
      default:
        return ' - ';
    }
  }

  override async getReading(): Promise<void> {
    this.lastReading[ReadingType.temperature] = String(await util.promisify(ds18b20.temperature)(this.address!));
  }
  override async addLastReadingToDatabase(): Promise<void> {
    this.growthDB.addSensorReading(this);
  }

  constructor(gdbSensor: GDBSensor, growthDB: GrowthDB) {
    super(gdbSensor, growthDB);
  }
}

export { DS18B20 };