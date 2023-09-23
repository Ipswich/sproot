import { GDBSensor } from "../../database/types/GDBSensor";
import { IGrowthDB } from "../../database/types/IGrowthDB";

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
  growthDB: IGrowthDB;
  readonly units: Record<ReadingType, string>;

  constructor(gdbSensor: GDBSensor, growthDB: IGrowthDB) {
    this.id = gdbSensor.id;
    this.description = gdbSensor.description;
    this.model = gdbSensor.model;
    this.address = gdbSensor.address;
    this.lastReading = {} as Record<ReadingType, string>;
    this.lastReadingTime = null;
    this.growthDB = growthDB;
    this.units = {} as Record<ReadingType, string>;
  }
  abstract getReadingAsync(): Promise<void>;
  
  addLastReadingToDatabaseAsync = async (): Promise<void> => await this.growthDB.addSensorReadingAsync(this);
}

abstract class DisposableSensorBase extends SensorBase {
  abstract disposeAsync(): Promise<void>;
}

export { SensorBase, DisposableSensorBase, ReadingType };