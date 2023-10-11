import { SDBSensor } from "../../database/types/SDBSensor";
import { ISprootDB } from "../../database/types/ISprootDB";

enum ReadingType {
  temperature = "temperature",
  humidity = "humidity",
  pressure = "pressure"
}

interface ISensorBase {
  id: number;
  description: string | null;
  model: string;
  address: string | null;
  lastReading:  Record<ReadingType, string>;
  lastReadingTime: Date | null;
  readonly units: Record<ReadingType, string>;
}

abstract class SensorBase implements ISensorBase {
  id: number;
  description: string | null;
  model: string;
  address: string | null;
  lastReading:  Record<ReadingType, string>;
  lastReadingTime: Date | null;
  sprootDB: ISprootDB;
  readonly units: Record<ReadingType, string>;

  constructor(sdbSensor: SDBSensor, sprootDB: ISprootDB) {
    this.id = sdbSensor.id;
    this.description = sdbSensor.description;
    this.model = sdbSensor.model;
    this.address = sdbSensor.address;
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

export { ISensorBase, SensorBase, DisposableSensorBase, ReadingType };