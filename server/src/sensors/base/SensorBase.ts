import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISensorBase, ReadingType, Units } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import winston from "winston";
import { QueueCache } from "@sproot/sproot-common/dist/utility/QueueCache";
import { SensorChartData } from "./SensorChartData";

export abstract class SensorBase implements ISensorBase {
  id: number;
  name: string;
  model: string;
  address: string | null;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  sprootDB: ISprootDB;
  color?: string | undefined;
  logger: winston.Logger;
  readonly units: Record<ReadingType, string>;
  maxCacheSize: number;
  chartDataPointInterval: number;
  maxChartDataSize: number;
  cacheData: Record<ReadingType, QueueCache<SDBReading>>;
  chartData: SensorChartData;
  updateInterval: NodeJS.Timeout | null = null;

  private updateMissCount = 0;

  constructor(
    sdbSensor: SDBSensor,
    sprootDB: ISprootDB,
    maxCacheSize: number,
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
    this.maxChartDataSize = maxChartDataSize;
    this.chartDataPointInterval = chartDataPointInterval;
    this.cacheData = {} as Record<ReadingType, QueueCache<SDBReading>>;
    for (const readingType of readingTypes) {
      this.units[readingType as ReadingType] = Units[readingType as ReadingType];
      this.cacheData[readingType as ReadingType] = new QueueCache<SDBReading>(maxCacheSize);
    }
    this.chartData = new SensorChartData(
      maxChartDataSize,
      chartDataPointInterval,
      undefined,
      readingTypes,
    );
  }

  abstract disposeAsync(): Promise<void>;
  abstract getReadingAsync(): Promise<void>;

  protected async intitializeCacheAndChartDataAsync(minutes: number): Promise<void> {
    await this.loadCachedReadingsFromDatabaseAsync(minutes);
    this.loadChartData();
  }

  protected async loadCachedReadingsFromDatabaseAsync(minutes: number): Promise<void> {
    try {
      for (const readingType in this.cacheData) {
        this.cacheData[readingType as ReadingType].clear();
      }
      //Fill cached readings with readings from database
      const sdbReadings = await this.sprootDB.getSensorReadingsAsync(
        this,
        new Date(),
        minutes,
        false,
      );
      for (const sdbReading of sdbReadings) {
        const newReading = {
          metric: sdbReading.metric,
          data: sdbReading.data,
          units: sdbReading.units,
          logTime: sdbReading.logTime.replace(" ", "T") + "Z",
        } as SDBReading;
        this.cacheData[sdbReading.metric as ReadingType].addData(newReading);
      }

      let updateInfoString = "";
      for (const readingType in this.cacheData) {
        updateInfoString += `${readingType}: ${this.cacheData[readingType as ReadingType].length()}`;
        if (readingType != Object.keys(this.cacheData)[Object.keys(this.cacheData).length - 1]) {
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
    try {
      for (const readingType in this.cacheData) {
        this.cacheData[readingType as ReadingType].addData({
          metric: readingType as ReadingType,
          data: this.lastReading[readingType as ReadingType],
          units: this.units[readingType as ReadingType],
          logTime: this.lastReadingTime?.toISOString(),
        } as SDBReading);
      }

      let updateInfoString = "";
      for (const readingType in this.cacheData) {
        updateInfoString += `${readingType}: ${this.cacheData[readingType as ReadingType].length()}`;
        if (readingType != Object.keys(this.cacheData)[Object.keys(this.cacheData).length - 1]) {
          updateInfoString += ", ";
        }
      }
      this.logger.info(
        `Updated cached readings for {${this.constructor.name}, id: ${this.id}}. Cache Size - ${updateInfoString}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to update cached readings for {${this.constructor.name}, id: ${this.id}}. ${err}`,
      );
    }
  }

  async updateDataStoresAsync(): Promise<void> {
    this.updateCachedReadings();
    for (const readingType in this.cacheData) {
      const lastCacheData = this.cacheData[readingType as ReadingType].get().slice(-1)[0];
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
          this.logger.error(
            `Chart data update miss count exceeded (3) for sensor {id: ${this.id}}. Forcing update to re-sync.`,
          );
          this.updateChartData();
          this.updateMissCount = 0;
        }
      }

      await this.addLastReadingToDatabaseAsync();
    }
  }

  addLastReadingToDatabaseAsync = async (): Promise<void> => {
    try {
      await this.sprootDB.addSensorReadingAsync(this);
    } catch (error) {
      this.logger.error(`Error adding reading to database for sensor ${this.id}: ${error}`);
    }
  };

  getCachedReadings(offset?: number, limit?: number): Record<string, SDBReading[]> {
    const result: Record<string, SDBReading[]> = {};
    if (offset == undefined || offset == null || limit == undefined || limit == null) {
      for (const key in this.cacheData) {
        result[key] = this.cacheData[key as ReadingType].get();
      }
      return result;
    }
    if (offset < 0 || limit < 1) {
      return result;
    }
    for (const key in this.cacheData) {
      if (offset > this.cacheData[key as ReadingType].length()) {
        return result;
      }
    }

    for (const key in this.cacheData) {
      result[key] = this.cacheData[key as ReadingType].get(offset, limit);
    }
    return result;
  }

  loadChartData(): void {
    for (const readingType in this.cacheData) {
      this.chartData.loadChartData(
        this.cacheData[readingType as ReadingType].get(),
        this.name,
        readingType as ReadingType,
      );
      this.logger.info(
        `Loaded chart data for sensor {id: ${this.id}}. Chart data size - ${this.chartData.getOne(readingType as ReadingType).length}`,
      );
    }
  }

  updateChartData(): void {
    for (const readingType in this.cacheData) {
      this.chartData.updateChartData(
        this.cacheData[readingType as ReadingType].get(),
        this.name,
        readingType as ReadingType,
      );
      this.logger.info(
        `Updated chart data for sensor {id: ${this.id}}. Chart data size - ${this.chartData.getOne(readingType as ReadingType).length}`,
      );
    }
  }

  protected internalDispose() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
