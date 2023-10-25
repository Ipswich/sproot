import { SDBSensor } from "../../database/types/SDBSensor";
import { SDBReading } from "../../database/types/SDBReading";
import { ISprootDB } from "../../database/types/ISprootDB";
import winston from "winston";

enum ReadingType {
  temperature = "temperature",
  humidity = "humidity",
  pressure = "pressure",
}

interface ISensorBase {
  id: number;
  description: string | null;
  model: string;
  address: string | null;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  readonly units: Record<ReadingType, string>;
}

abstract class SensorBase implements ISensorBase {
  id: number;
  description: string | null;
  model: string;
  address: string | null;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  sprootDB: ISprootDB;
  logger: winston.Logger;
  readonly units: Record<ReadingType, string>;
  cachedReadings: Record<ReadingType, SDBReading[]>;

  constructor(sdbSensor: SDBSensor, sprootDB: ISprootDB, logger: winston.Logger) {
    this.id = sdbSensor.id;
    this.description = sdbSensor.description;
    this.model = sdbSensor.model;
    this.address = sdbSensor.address;
    this.lastReading = {} as Record<ReadingType, string>;
    this.lastReadingTime = null;
    this.sprootDB = sprootDB;
    this.logger = logger;
    this.units = {} as Record<ReadingType, string>;
    this.cachedReadings = {} as Record<ReadingType, SDBReading[]>;
  }
  abstract getReadingAsync(): Promise<void>;
  protected abstract updateCachedReadings(): void;
  protected abstract loadCachedReadingsFromDatabaseAsync(count: number): Promise<void>;

  addLastReadingToDatabaseAsync = async (): Promise<void> => {
    this.updateCachedReadings();
    await this.sprootDB.addSensorReadingAsync(this);
  };

  getCachedReadings(offset?: number, limit?: number): Record<string, SDBReading[]> {
    if (!offset || !limit) {
      return this.cachedReadings;
    }
    if (offset < 0 || limit < 1) {
      return {};
    }
    for (const key in this.cachedReadings) {
      if (offset > this.cachedReadings[key as ReadingType].length) {
        return {};
      }
    }

    const result: Record<string, SDBReading[]> = {};
    for (const key in this.cachedReadings) {
      result[key] = this.cachedReadings[key as ReadingType].slice(offset, offset + limit);
    }
    return result;
  }
}

abstract class DisposableSensorBase extends SensorBase {
  abstract disposeAsync(): Promise<void>;
}

export { ISensorBase, SensorBase, DisposableSensorBase, ReadingType };
