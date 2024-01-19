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

  protected async loadCachedReadingsFromDatabaseAsync(minutes: number): Promise<void> {
    for (const readingType in this.cachedReadings) {
      this.cachedReadings[readingType as ReadingType] = [];
    }
    //Fill cached readings with readings from database
    const sdbReadings = await this.sprootDB.getSensorReadingsAsync(this, new Date(), minutes);
    for (const sdbReading of sdbReadings) {
      const newReading = {
        metric: sdbReading.metric as ReadingType,
        data: sdbReading.data,
        units: sdbReading.units,
        logTime: sdbReading.logTime,
      } as SDBReading;
      this.cachedReadings[sdbReading.metric as ReadingType]?.push(newReading);
    }
  }

  protected updateCachedReadings(): void {
    for (const readingType in this.cachedReadings) {
      this.cachedReadings[readingType as ReadingType].push({
        metric: readingType as ReadingType,
        data: this.lastReading[readingType as ReadingType],
        units: this.units[readingType as ReadingType],
        logTime: this.lastReadingTime?.toISOString(),
      } as SDBReading);

      while (
        this.cachedReadings[readingType as ReadingType].length >
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!)
      ) {
        this.cachedReadings[readingType as ReadingType].shift();
      }
    }
  }

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
