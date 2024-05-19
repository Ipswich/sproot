import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import { IChartable, ChartData, DataSeries } from "@sproot/sproot-common/dist/utility/IChartable";

export class SensorChartData implements IChartable {
  chartData: Record<ReadingType, ChartData>;
  readonly limit: number;
  readonly intervalMinutes: number;
  constructor(
    limit: number,
    intervalMinutes: number,
    dataSeriesRecord?: Record<ReadingType, DataSeries>,
    readingTypes?: ReadingType[],
  ) {
    this.limit = limit;
    this.intervalMinutes = intervalMinutes;
    this.chartData = {} as Record<ReadingType, ChartData>;
    for (const readingType in dataSeriesRecord) {
      this.chartData[readingType as ReadingType] = new ChartData(
        limit,
        intervalMinutes,
        dataSeriesRecord ? dataSeriesRecord[readingType as ReadingType] : undefined,
      );
    }
    if (!dataSeriesRecord && readingTypes) {
      for (const readingType of readingTypes) {
        this.chartData[readingType] = new ChartData(
          limit,
          intervalMinutes,
          dataSeriesRecord ? dataSeriesRecord[readingType] : undefined,
        );
      }
    }
  }

  /**
   * Gets a copy of a data series.
   * @param key dataSeries key
   * @returns a copy of the data series
   */
  getOne(key: ReadingType): DataSeries {
    if (!this.chartData[key as ReadingType]) {
      return [];
    }

    return [...this.chartData[key as ReadingType].get()];
  }

  /**
   * Gets a copy of all data series.
   * @returns a copy of all data series.
   */
  getAll(): Record<ReadingType, DataSeries> {
    const res = {} as Record<ReadingType, DataSeries>;
    for (const key in this.chartData) {
      res[key as ReadingType] = { ...this.chartData[key as ReadingType].get() };
    }
    return res;
  }

  loadChartData(cache: SDBReading[], sensorName: string, key: ReadingType): void {
    //If there isn't an existing ChartData for this key, create it
    if (!this.chartData[key]) {
      this.chartData[key] = new ChartData(this.limit, this.intervalMinutes);
    }
    for (const reading of cache) {
      const formattedDate = ChartData.formatDateForChart(reading.logTime);
      const value = this.getOne(key).find((x) => x.name == formattedDate);
      if (value) {
        value[sensorName] = reading.data;
      }
    }
  }

  updateChartData(cache: SDBReading[], sensorName: string, key: ReadingType): void {
    const lastCacheData = cache[cache.length - 1];
    if (lastCacheData) {
      const name = ChartData.formatDateForChart(lastCacheData.logTime);
      //If there isn't an existing ChartData for this key, create it
      if (!this.chartData[key]) {
        this.chartData[key] = new ChartData(this.limit, this.intervalMinutes);
      }
      //Add Only if not the same time stamp as the last data point
      if (name != this.chartData[key].get().slice(-1)[0]?.name) {
        this.chartData[key].addDataPoint({
          name,
          [sensorName]: lastCacheData.data,
        });
      }
    }
  }

  shouldUpdateChartData(key: ReadingType, lastCacheData?: SDBReading): boolean {
    const lastChartData = this.chartData[key].get().slice(-1)[0];
    if (
      lastChartData &&
      lastCacheData &&
      lastChartData.name ==
        ChartData.formatDateForChart(
          new Date(new Date(lastCacheData.logTime).getTime() - this.intervalMinutes * 60000),
        )
    ) {
      return true;
    }
    return false;
  }
}
