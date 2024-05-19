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
      res[key as ReadingType] = [...this.chartData[key as ReadingType].get()];
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

  updateChartData(cache: DataSeries[], _sensorName: string, key: ReadingType): void {
    const combinedDataSeries = ChartData.combineDataSeries(cache);
    //If there isn't an existing ChartData for this key, create it
    if (!this.chartData[key]) {
      this.chartData[key] = new ChartData(this.limit, this.intervalSeconds, combinedDataSeries);
      return;
    }

    const lastCombinedDataPoint = combinedDataSeries[combinedDataSeries.length - 1];
    if (lastCombinedDataPoint) {
      const dateName = lastCombinedDataPoint.name;
      //Add Only if not the same time stamp as the last data point
      if (dateName != this.chartData[key].get().slice(-1)[0]?.name) {
        const { name, ...data } = lastCombinedDataPoint;
        this.chartData[key].addDataPoint({
          name: dateName,
          ...data,
        });
      }
    }
  }
}
