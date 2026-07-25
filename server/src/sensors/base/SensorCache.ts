import { ISensorsRepository } from "@sproot/common/dist/database/sensors/ISensorsRepository";
import { SDBReading } from "@sproot/common/dist/database/SDBReading";
import { ReadingType } from "@sproot/common/dist/sensors/ReadingType";
import { QueueCache } from "@sproot/common/dist/utility/QueueCache";
import winston from "winston";

export class SensorCache {
  queueCache: Record<ReadingType, QueueCache<SDBReading>>;
  sensorsRepository: ISensorsRepository;
  logger: winston.Logger;
  readonly maxSize: number;
  constructor(maxSize: number, sensorsRepository: ISensorsRepository, logger: winston.Logger) {
    this.maxSize = maxSize;
    this.queueCache = {} as Record<ReadingType, QueueCache<SDBReading>>;
    this.sensorsRepository = sensorsRepository;
    this.logger = logger;
  }

  get(key: ReadingType, offset?: number, limit?: number): SDBReading[] {
    if (!this.queueCache[key]) {
      return [];
    }
    return this.queueCache[key].get(offset, limit);
  }

  async loadFromDatabaseAsync(
    sensorId: number,
    minutes: number,
    bucketMinutes: number = 5,
  ): Promise<void> {
    this.clear();
    const readings = await this.sensorsRepository.getBucketedSensorReadingsAsync(
      { id: sensorId },
      new Date(),
      minutes,
      bucketMinutes,
      true,
    );
    const sdbReadings =
      readings ??
      (await this.sensorsRepository.getSensorReadingsAsync(
        { id: sensorId },
        new Date(),
        minutes,
        true,
      ));
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
      this.queueCache[key as ReadingType].clear();
    }
  }
}
