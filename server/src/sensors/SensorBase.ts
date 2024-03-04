import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISensorBase, ReadingType } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import winston from "winston";
import { ChartData, IChartable } from "@sproot/sproot-common/dist/utility/IChartable";
import { QueueCache } from "@sproot/sproot-common/dist/utility/QueueCache";

abstract class SensorBase implements ISensorBase, IChartable {
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
  chartData: Record<ReadingType, ChartData>;
  cacheData: Record<ReadingType, QueueCache<SDBReading>>;
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
    this.cacheData = {} as Record<ReadingType, QueueCache<SDBReading>>;
    for (const readingType in ReadingType) {
      this.cacheData[readingType as ReadingType] = new QueueCache<SDBReading>(
        Number(process.env["MAX_CACHE_SIZE"]!),
      );
    }
    this.chartData = {} as Record<string | number | symbol, ChartData>;
    for (const readingType in ReadingType) {
      this.chartData[readingType as ReadingType] = new ChartData(
        Number(process.env["MAX_CHART_DATA_POINTS"]!),
      );
    }
  }

  abstract disposeAsync(): Promise<void>;
  abstract getReadingAsync(): Promise<void>;

  protected async intitializeCacheAndChartDataAsync(minutes: number): Promise<void> {
    await this.loadCachedReadingsFromDatabaseAsync(minutes);
    this.loadChartData();
  }

  protected async loadCachedReadingsFromDatabaseAsync(minutes: number): Promise<void> {
    try {
      for (const readingType in this.cachedReadings) {
        this.cachedReadings[readingType as ReadingType] = [];
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
        this.cachedReadings[sdbReading.metric as ReadingType]?.push(newReading);
        this.cacheData[sdbReading.metric as ReadingType].addData(newReading);
      }

      let updateInfoString = "";
      for (const readingType in this.cachedReadings) {
        updateInfoString += `${readingType}: ${this.cachedReadings[readingType as ReadingType].length}`;
        if (
          readingType !=
          Object.keys(this.cachedReadings)[Object.keys(this.cachedReadings).length - 1]
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
    try {
      for (const readingType in this.cachedReadings) {
        const newReading = {
          metric: readingType as ReadingType,
          data: this.lastReading[readingType as ReadingType],
          units: this.units[readingType as ReadingType],
          logTime: this.lastReadingTime?.toISOString(),
        } as SDBReading;
        this.cachedReadings[readingType as ReadingType].push(newReading);
        this.cacheData[readingType as ReadingType].addData(newReading);

        while (
          this.cachedReadings[readingType as ReadingType].length >
          Number(process.env["MAX_CACHE_SIZE"]!)
        ) {
          this.cachedReadings[readingType as ReadingType].shift();
        }
      }

      let updateInfoString = "";
      for (const readingType in this.cachedReadings) {
        updateInfoString += `${readingType}: ${this.cachedReadings[readingType as ReadingType].length}`;
        if (
          readingType !=
          Object.keys(this.cachedReadings)[Object.keys(this.cachedReadings).length - 1]
        ) {
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

  loadChartData(): void {
    for (const readingType in this.cachedReadings) {
      for (const reading of this.cachedReadings[readingType as ReadingType]) {
        if (!this.chartData[readingType as ReadingType]) {
          const value = this.chartData[readingType as ReadingType]?.dataSeries.filter(
            (x) => x.name === ChartData.formatDateForChart(reading.logTime),
          );
          if (value && value[0]) {
            value[0][this.name] = ChartData.formatDecimalReadingForDisplay(reading.data);
          }
        }
      }
    }
  }

  updateChartData(): void {
    for (const readingType in this.cachedReadings) {
      const lastCacheData =
        this.cachedReadings[readingType as ReadingType][
          this.cachedReadings[readingType as ReadingType].length - 1
        ];
      if (lastCacheData) {
        this.chartData[readingType as ReadingType]?.addDataPoint({
          name: ChartData.formatDateForChart(lastCacheData.logTime),
          [this.name]: ChartData.formatDecimalReadingForDisplay(lastCacheData.data),
        });
      }
    }
  }

  protected internalDispose() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

export { SensorBase };
