import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import { IChartable, ChartData, DataSeries } from "@sproot/sproot-common/dist/utility/IChartable";

export class SensorListChartData implements IChartable {
  chartData: Record<ReadingType, ChartData>;
  readonly limit: number;
  readonly intervalSeconds: number;
  constructor(limit: number, interval: number, dataSeriesRecord?: Record<ReadingType, DataSeries>) {
    this.limit = limit;
    this.intervalSeconds = interval * 60000;
    this.chartData = {} as Record<ReadingType, ChartData>;
    for (const readingType in dataSeriesRecord) {
      this.chartData[readingType as ReadingType] = new ChartData(
        limit,
        interval,
        dataSeriesRecord ? dataSeriesRecord[readingType as ReadingType] : undefined,
      );
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

  loadChartData(cache: DataSeries[], _sensorName: string, key: ReadingType): void {
    //If there isn't an existing ChartData for this key, create it
    if (!this.chartData[key]) {
      this.chartData[key] = new ChartData(
        this.limit,
        this.intervalSeconds,
        ChartData.combineDataSeries(cache),
      );
      return;
    }
    //Merge all provided dataSeries into one
    const combinedDataSeries = ChartData.combineDataSeries(cache);
    for (const dataPoint of combinedDataSeries) {
      const value = this.getOne(key).find((x) => x.name == dataPoint.name);
      if (value) {
        //For each sensor in the dataPoint, conditionally find
        //and add the K:V sensorName:reading to chart data
        for (const sensorName of Object.keys(dataPoint)) {
          if (sensorName == "name") {
            continue;
          }
          value[sensorName] = dataPoint[sensorName] as string | number;
        }
      }
    }
  }

  updateChartData(_cache: DataSeries[], _sensorName: string, _key: ReadingType): void {
    // const lastCacheData = cache[cache.length - 1];
    // if (lastCacheData) {
    //   const name = ChartData.formatDateForChart(lastCacheData.logTime);
    //   //If there isn't an existing ChartData for this key, create it
    //   if (!this.chartData[key]) {
    //     this.chartData[key] = new ChartData(this.limit, this.intervalSeconds);
    //   }
    //   //Add Only if not the same time stamp as the last data point
    //   if (name != this.chartData[key].get().slice(-1)[0]?.name) {
    //     this.chartData[key].addDataPoint({
    //       name,
    //       [sensorName]: lastCacheData.data,
    //     });
    //   }
    // }
  }

  shouldUpdateChartData(key: ReadingType, lastCacheData?: SDBReading): boolean {
    const lastChartData = this.chartData[key].get().slice(-1)[0];
    if (
      lastChartData &&
      lastCacheData &&
      lastChartData.name ==
        ChartData.formatDateForChart(
          new Date(new Date(lastCacheData.logTime).getTime() - this.intervalSeconds),
        )
    ) {
      return true;
    }
    return false;
  }
}
