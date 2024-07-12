import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISensorBase } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import winston from "winston";
import { SensorChartData } from "./SensorChartData";
import { ReadingType, Units } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SensorCache } from "./SensorCache";

export abstract class SensorBase implements ISensorBase {
  id: number;
  name: string;
  model: string;
  address: string | null;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  color: string | null;
  sprootDB: ISprootDB;
  logger: winston.Logger;
  readonly units: Record<ReadingType, string>;
  maxCacheSize: number;
  initialCacheLookback: number;
  maxChartDataSize: number;
  chartDataPointInterval: number;
  cacheData: SensorCache;
  chartData: SensorChartData;
  updateInterval: NodeJS.Timeout | null = null;

  private updateMissCount = 0;

  constructor(
    sdbSensor: SDBSensor,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    readingTypes: ReadingType[],
    logger: winston.Logger,
  ) {
    this.id = sdbSensor.id;
    this.name = sdbSensor.name;
    this.model = sdbSensor.model;
    this.address = sdbSensor.address;
    this.lastReading = {} as Record<ReadingType, string>;
    this.lastReadingTime = null;
    this.sprootDB = sprootDB;
    this.color = sdbSensor.color;
    this.logger = logger;
    this.units = {} as Record<ReadingType, string>;
    this.maxCacheSize = maxCacheSize;
    this.initialCacheLookback = initialCacheLookback;
    this.maxChartDataSize = maxChartDataSize;
    this.chartDataPointInterval = chartDataPointInterval;
    for (const readingType of readingTypes) {
      this.units[readingType as ReadingType] = Units[readingType as ReadingType];
    }

    this.cacheData = new SensorCache(maxCacheSize, sprootDB, logger);
    this.chartData = new SensorChartData(
      maxChartDataSize,
      chartDataPointInterval,
      undefined,
      readingTypes,
    );
  }

  abstract disposeAsync(): Promise<void>;
  abstract getReadingAsync(): Promise<void>;

  protected async intitializeCacheAndChartDataAsync(): Promise<void> {
    await this.loadCachedReadingsFromDatabaseAsync();
    this.loadChartData();
  }

  protected async loadCachedReadingsFromDatabaseAsync(): Promise<void> {
    try {
      this.cacheData.clear();
      await this.cacheData.loadCacheFromDatabaseAsync(this.id, this.initialCacheLookback);

      let updateInfoString = "";
      for (const readingType in this.units) {
        updateInfoString += `${readingType}: ${this.cacheData.get(readingType as ReadingType).length}`;
        if (
          readingType !=
          Object.keys(this.cacheData.queueCache)[Object.keys(this.cacheData.queueCache).length - 1]
        ) {
          updateInfoString += ", ";
        }
      }
      this.logger.info(
        `Loaded cached readings for {${this.constructor.name}, id: ${this.id}}. Cache Size - ${updateInfoString}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to load cached readings for {${this.constructor.name}, id: ${this.id}}. ${err}`,
      );
    }
  }

  protected updateCachedReadings(): void {
    for (const readingType in this.units) {
      this.cacheData.addData({
        metric: readingType as ReadingType,
        data: this.lastReading[readingType as ReadingType],
        units: this.units[readingType as ReadingType],
        logTime: this.lastReadingTime?.toISOString(),
      } as SDBReading);
    }

    let updateInfoString = "";
    for (const readingType in this.units) {
      updateInfoString += `${readingType}: ${this.cacheData.get(readingType as ReadingType).length}`;
      if (
        readingType !=
        Object.keys(this.cacheData.queueCache)[Object.keys(this.cacheData.queueCache).length - 1]
      ) {
        updateInfoString += ", ";
      }
    }
    this.logger.info(
      `Updated cached readings for {${this.constructor.name}, id: ${this.id}}. Cache Size - ${updateInfoString}`,
    );
  }

  async updateDataStoresAsync(): Promise<void> {
    this.updateCachedReadings();
    for (const readingType in this.units) {
      const lastCacheData = this.cacheData.get(readingType as ReadingType).slice(-1)[0];
      //Only update chart if the most recent datapoint is N minutes after last cache
      if (this.chartData.shouldUpdateChartData(readingType as ReadingType, lastCacheData)) {
        this.updateChartData();
        //Reset miss count if successful
        this.updateMissCount = 0;
      } else {
        //Increment miss count if unsuccessful. Easy CYA if things get out of sync.
        this.updateMissCount++;
        //If miss count exceeds 10 * N, force update (3 real tries, because intervals).
        if (this.updateMissCount >= 3 * this.chartDataPointInterval) {
          this.logger.warn(
            `Chart data update miss count exceeded (3) for sensor {id: ${this.id}}. Forcing update to re-sync.`,
          );
          this.updateChartData();
          this.updateMissCount = 0;
        }
      }
    }
    await this.addLastReadingToDatabaseAsync();
  }

  addLastReadingToDatabaseAsync = async (): Promise<void> => {
    try {
      await this.sprootDB.addSensorReadingAsync(this);
    } catch (error) {
      this.logger.error(`Error adding reading to database for sensor ${this.id}: ${error}`);
    }
  };

  getCachedReadings(offset?: number, limit?: number): Partial<Record<string, SDBReading[]>> {
    const result: Record<string, SDBReading[]> = {};
    for (const key in this.units) {
      result[key] = this.cacheData.get(key as ReadingType, offset, limit);
    }
    return result;
  }

  loadChartData(): void {
    for (const readingType in this.units) {
      this.chartData.loadChartData(
        this.cacheData.get(readingType as ReadingType),
        this.name,
        readingType as ReadingType,
      );
      this.logger.info(
        `Loaded chart data for sensor {id: ${this.id}}. Chart data size - ${this.chartData.get().data[readingType as ReadingType].length}`,
      );
    }
    this.chartData.loadChartSeries({ name: this.name, color: this.color ?? "dark" });
  }

  updateChartData(): void {
    for (const readingType in this.units) {
      this.chartData.updateChartData(
        this.cacheData.get(readingType as ReadingType),
        this.name,
        readingType as ReadingType,
      );
      this.logger.info(
        `Updated chart data for sensor {id: ${this.id}, ${readingType}}. Chart data size - ${this.chartData.get().data[readingType as ReadingType].length}`,
      );
    }
  }

  protected internalDispose() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
