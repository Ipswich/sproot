import { GDBSensor } from "./database-objects/GDBSensor";
import { GrowthDB } from "../GrowthDB";

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
  growthDB: GrowthDB;

  constructor(gdbSensor: GDBSensor, growthDB: GrowthDB) {
    this.id = gdbSensor.id;
    this.description = gdbSensor.description;
    this.model = gdbSensor.model;
    this.address = gdbSensor.address;
    this.lastReading = {} as Record<ReadingType, string>;
    this.lastReadingTime = null;
    this.growthDB = growthDB;
  }

  abstract getUnits(readingType: ReadingType): string;
  abstract getReading(): Promise<void>;
  abstract addLastReadingToDatabase(): Promise<void>;
}

abstract class DisposableSensorBase extends SensorBase {
  abstract dispose(): Promise<void>;
}

export { SensorBase, DisposableSensorBase, ReadingType };