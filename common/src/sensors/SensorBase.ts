import { SDBSensor } from "../database/SDBSensor";
import { SDBReading } from "../database/SDBReading";
import { ISprootDB } from "../database/ISprootDB";
import winston from "winston";

enum ReadingType {
  temperature = "temperature",
  humidity = "humidity",
  pressure = "pressure",
}

interface ISensorBase {
  id: number;
  name: string;
  model: string;
  address: string | null;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  readonly units: Record<ReadingType, string>;
}

abstract class SensorBase implements ISensorBase {
  id: number;
  name: string;
  model: string;
  address: string | null;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  sprootDB: ISprootDB;
  logger: winston.Logger;
  readonly units: Record<ReadingType, string>;
  cachedReadings: Record<ReadingType, SDBReading[]>;
  updateInterval: NodeJS.Timeout | null = null;

  constructor(sdbSensor: SDBSensor, sprootDB: ISprootDB, logger: winston.Logger) {
    this.id = sdbSensor.id;
    this.name = sdbSensor.name;
    this.model = sdbSensor.model;
    this.address = sdbSensor.address;
    this.lastReading = {} as Record<ReadingType, string>;
    this.lastReadingTime = null;
    this.sprootDB = sprootDB;
    this.logger = logger;
    this.units = {} as Record<ReadingType, string>;
    this.cachedReadings = {} as Record<ReadingType, SDBReading[]>;
  }

  abstract disposeAsync(): Promise<void>;
  abstract getReadingAsync(): Promise<void>;
  protected abstract updateCachedReadings(): void;
  protected abstract loadCachedReadingsFromDatabaseAsync(minutes: number): Promise<void>;

  addLastReadingToDatabaseAsync = async (): Promise<void> => {
    this.updateCachedReadings();
    try {
      await this.sprootDB.addSensorReadingAsync(this);
    } catch (error) {
      this.logger.error(`Error adding reading to database for sensor ${this.id}: ${error}`);
    }
  };

  getCachedReadings(offset?: number, limit?: number): Record<string, SDBReading[]> {
    if (offset == undefined || offset == null || limit == undefined || limit == null) {
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

  protected internalDispose() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

export { SensorBase, ReadingType };
export type { ISensorBase };
