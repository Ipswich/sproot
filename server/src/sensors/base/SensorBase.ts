import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISensorBase } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import { ReadingType, Units } from "@sproot/sproot-common/dist/sensors/ReadingType";
import winston from "winston";
import { SensorChartData } from "./SensorChartData";
import { SensorCache } from "./SensorCache";
import { DataSeries, ChartSeries } from "@sproot/utility/ChartData";

export abstract class SensorBase implements ISensorBase {
  readonly id: number;
  readonly model: string;
  readonly address: string | null;
  name: string;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  color: string | null;
  readonly units: Record<ReadingType, string>;
  readonly sprootDB: ISprootDB;
  readonly logger: winston.Logger;
  #updateInterval: NodeJS.Timeout | null = null;
  #cache: SensorCache;
  #initialCacheLookback: number;
  #chartData: SensorChartData;
  #chartDataPointInterval: number;

  #updateMissCount = 0;

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
    this.#initialCacheLookback = initialCacheLookback;
    this.#chartDataPointInterval = chartDataPointInterval;
    for (const readingType of readingTypes) {
      this.units[readingType as ReadingType] = Units[readingType as ReadingType];
    }

    this.#cache = new SensorCache(maxCacheSize, sprootDB, logger);
    this.#chartData = new SensorChartData(
      maxChartDataSize,
      this.#chartDataPointInterval,
      undefined,
      readingTypes,
    );
  }

  abstract initAsync(): Promise<SensorBase | null>;
  abstract disposeAsync(): Promise<void>;
  abstract takeReadingAsync(): Promise<void>;

  getCachedReadings(offset?: number, limit?: number): Partial<Record<string, SDBReading[]>> {
    const result: Record<string, SDBReading[]> = {};
    for (const key in this.units) {
      result[key] = this.#cache.get(key as ReadingType, offset, limit);
    }
    return result;
  }

  getChartData(): {
    data: Record<ReadingType, DataSeries>;
    series: ChartSeries;
  } {
    return this.#chartData.get();
  }

  async updateDataStoresAsync(): Promise<void> {
    this.#updateCachedReadings();
    for (const readingType in this.units) {
      const lastCacheData = this.#cache.get(readingType as ReadingType).slice(-1)[0];
      //Only update chart if the most recent datapoint is N minutes after last cache
      if (this.#chartData.shouldUpdateChartData(readingType as ReadingType, lastCacheData)) {
        this.#updateChartData();
        //Reset miss count if successful
        this.#updateMissCount = 0;
      } else {
        //Increment miss count if unsuccessful. Easy CYA if things get out of sync.
        this.#updateMissCount++;
        //If miss count exceeds 3 * N, force update (3 real tries, because intervals).
        if (this.#updateMissCount >= 3 * this.#chartDataPointInterval) {
          this.logger.warn(
            `Chart data update miss count exceeded (3) for sensor {id: ${this.id}}. Forcing update to re-sync.`,
          );
          this.#updateChartData();
          this.#updateMissCount = 0;
        }
      }
    }
    await this.#addLastReadingToDatabaseAsync();
  }

  protected async createSensorAsync(
    sensorModel: string,
    maxSensorReadTime: number,
  ): Promise<this | null> {
    const profiler = this.logger.startTimer();
    try {
      await this.intitializeCacheAndChartDataAsync();
      this.#updateInterval = setInterval(async () => {
        await this.takeReadingAsync();
      }, maxSensorReadTime);
    } catch (err) {
      this.logger.error(`Failed to create ${sensorModel} sensor ${this.id}. ${err}`);
      return null;
    } finally {
      profiler.done({
        message: `Initialization time for sensor {${sensorModel}, id: ${this.id}, address: ${this.address}`,
        level: "debug",
      });
    }
    return this;
  }

  protected async intitializeCacheAndChartDataAsync(): Promise<void> {
    await this.#loadCacheFromDatabaseAsync();
    this.#loadChartData();
  }

  protected internalDispose() {
    if (this.#updateInterval) {
      clearInterval(this.#updateInterval);
    }
  }

  async #loadCacheFromDatabaseAsync(): Promise<void> {
    try {
      this.#cache.clear();
      await this.#cache.loadFromDatabaseAsync(this.id, this.#initialCacheLookback);

      let updateInfoString = "";
      for (const readingType in this.units) {
        updateInfoString += `${readingType}: ${this.#cache.get(readingType as ReadingType).length}`;
        if (
          readingType !=
          Object.keys(this.#cache.queueCache)[Object.keys(this.#cache.queueCache).length - 1]
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

  #updateCachedReadings(): void {
    for (const readingType in this.units) {
      this.#cache.addData({
        metric: readingType as ReadingType,
        data: this.lastReading[readingType as ReadingType],
        units: this.units[readingType as ReadingType],
        logTime: this.lastReadingTime?.toISOString(),
      } as SDBReading);
    }

    let updateInfoString = "";
    for (const readingType in this.units) {
      updateInfoString += `${readingType}: ${this.#cache.get(readingType as ReadingType).length}`;
      if (
        readingType !=
        Object.keys(this.#cache.queueCache)[Object.keys(this.#cache.queueCache).length - 1]
      ) {
        updateInfoString += ", ";
      }
    }
    this.logger.info(
      `Updated cached readings for {${this.constructor.name}, id: ${this.id}}. Cache Size - ${updateInfoString}`,
    );
  }

  #addLastReadingToDatabaseAsync = async (): Promise<void> => {
    try {
      await this.sprootDB.addSensorReadingAsync(this);
    } catch (error) {
      this.logger.error(`Error adding reading to database for sensor ${this.id}: ${error}`);
    }
  };

  #loadChartData(): void {
    for (const readingType in this.units) {
      this.#chartData.loadChartData(
        this.#cache.get(readingType as ReadingType),
        this.name,
        readingType as ReadingType,
      );
      this.logger.info(
        `Loaded chart data for sensor {id: ${this.id}}. Chart data size - ${this.#chartData.get().data[readingType as ReadingType].length}`,
      );
    }
    this.#chartData.loadChartSeries({ name: this.name, color: this.color ?? "dark" });
  }

  #updateChartData(): void {
    for (const readingType in this.units) {
      this.#chartData.updateChartData(
        this.#cache.get(readingType as ReadingType),
        this.name,
        readingType as ReadingType,
      );
      this.logger.info(
        `Updated chart data for sensor {id: ${this.id}, ${readingType}}. Chart data size - ${this.#chartData.get().data[readingType as ReadingType].length}`,
      );
    }
  }
}
