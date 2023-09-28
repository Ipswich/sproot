import { SDBSensor } from "../../database/types/SDBSensor";
import { ISprootDB } from "../../database/types/ISprootDB";

enum ReadingType {
  temperature = "temperature",
  humidity = "humidity",
  pressure = "pressure"
}

abstract class SensorBase {
  id: number;
  description: string | null;
  model: string;
  address: string | null;
  lastReading:  Record<ReadingType, string>;
  lastReadingTime: Date | null;
  sprootDB: ISprootDB;
  readonly units: Record<ReadingType, string>;

  constructor(gdbSensor: SDBSensor, sprootDB: ISprootDB) {
    this.id = gdbSensor.id;
    this.description = gdbSensor.description;
    this.model = gdbSensor.model;
    this.address = gdbSensor.address;
    this.lastReading = {} as Record<ReadingType, string>;
    this.lastReadingTime = null;
    this.sprootDB = sprootDB;
    this.units = {} as Record<ReadingType, string>;
  }
  abstract getReadingAsync(): Promise<void>;
  
  addLastReadingToDatabaseAsync = async (): Promise<void> => await this.sprootDB.addSensorReadingAsync(this);
}

abstract class DisposableSensorBase extends SensorBase {
  abstract disposeAsync(): Promise<void>;
}

export { SensorBase, DisposableSensorBase, ReadingType };