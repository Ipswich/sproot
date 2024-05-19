import { ISprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import { SDBReading } from "@sproot/sproot-common/src/database/SDBReading";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { QueueCache } from "@sproot/sproot-common/src/utility/QueueCache";
import winston from "winston";

export class SensorCache {
  queueCache: Record<ReadingType, QueueCache<SDBReading>>;
  sprootDB: ISprootDB;
  logger: winston.Logger;
  readonly maxSize: number;
  constructor(maxSize: number, sprootDB: ISprootDB, logger: winston.Logger) {
    this.maxSize = maxSize;
    this.queueCache = {} as Record<ReadingType, QueueCache<SDBReading>>;
    this.sprootDB = sprootDB;
    this.logger = logger;
  }

  get(key: ReadingType, offset?: number, limit?: number): SDBReading[] {
    if (!this.queueCache[key]) {
      return [];
    }
    return this.queueCache[key].get(offset, limit);
  }

  async loadCacheFromDatabaseAsync(sensorId: number, minutes: number): Promise<void> {
    this.clear();
    const sdbReadings = await this.sprootDB.getSensorReadingsAsync(
      { id: sensorId },
      new Date(),
      minutes,
      true,
    );
    for (const reading of sdbReadings) {
      const newReading = {
        data: reading.data,
        metric: reading.metric,
        units: reading.units,
        logTime: reading.logTime,
      } as SDBReading;

      if (!this.queueCache[reading.metric]) {
        this.queueCache[reading.metric] = new QueueCache<SDBReading>(this.maxSize);
      }
      this.queueCache[reading.metric].addData(newReading);
    }
  }

  addData(reading: SDBReading, now = new Date()): void {
    if (!this.queueCache[reading.metric]) {
      this.queueCache[reading.metric] = new QueueCache<SDBReading>(this.maxSize);
    }
    this.queueCache[reading.metric].addData({
      data: reading.data,
      metric: reading.metric,
      units: reading.units,
      logTime: now.toISOString(),
    } as SDBReading);
  }

  clear(): void {
    for (const key in this.queueCache) {
      if (this.queueCache.hasOwnProperty(key)) {
        this.queueCache[key as ReadingType].clear();
      }
    }
  }
}
