export interface DataPoint {
  name: string;
  units?: string;
  [key: string]: number | string;
}

export type DataSeries = DataPoint[];

export class ChartData {
  static cachedEmptyDataSeries: DataSeries = [];
  static cachedEmptyDataSeriesID: string = "";
  dataSeries: DataSeries;
  readonly limit: number;

  constructor(limit: number, dataSeries?: DataSeries, now: Date = new Date()) {
    this.limit = limit;
    if (dataSeries) {
      this.dataSeries = dataSeries;
      while (this.dataSeries.length > limit) {
        this.dataSeries.shift();
      }
    } else {
      this.dataSeries = ChartData.generateEmptyDataSeries(this.limit, now);
    }
  }

  get(): DataSeries {
    return this.dataSeries;
  }

  public addDataPoint(dataPoint: DataPoint): void {
    this.dataSeries.push(dataPoint);
    if (this.dataSeries.length > this.limit) {
      this.dataSeries.shift();
    }
  }

  public static generateEmptyDataSeries(limit: number, now: Date = new Date()): DataSeries {
    const fiveMinutes = 1000 * 60 * 5;
    const newDataSeries: DataSeries = [];
    let fiveMinuteDate = new Date(Math.floor(now.getTime() / fiveMinutes) * fiveMinutes);

    const dataId = this.formatDateForChart(fiveMinuteDate);
    if (dataId === this.cachedEmptyDataSeriesID) {
      return this.cachedEmptyDataSeries;
    }
    this.cachedEmptyDataSeriesID = dataId;

    for (let i = 0; i < limit; i++) {
      newDataSeries.unshift({ name: this.formatDateForChart(fiveMinuteDate) });
      fiveMinuteDate = new Date(fiveMinuteDate.getTime() - fiveMinutes);
    }
    this.cachedEmptyDataSeries = newDataSeries;
    return newDataSeries;
  }

  public static formatDateForChart(date: Date | string): string {
    if (typeof date === "string") {
      date = new Date(date);
    }
    let hours = date.getHours();
    const amOrPm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${month}/${day} ${hours}:${minutes} ${amOrPm}`;
  }

  static formatDecimalReadingForDisplay(data: string): string {
    return parseFloat(data).toFixed(3);
  }

  static combineDataSeries(data: DataSeries[]): DataSeries {
    const combinedInput = data.flat();
    const grouped = combinedInput.reduce(
      (acc, obj) => {
        const key = obj.name;
        if (!acc[key]) {
          acc[key] = [];
        }
        // Add object to list for given key's value
        acc[key]?.push(obj);
        return acc;
      },
      {} as Record<string, DataPoint[]>,
    );

    const result = Object.entries(grouped).map(([key, value]) => {
      const dataPoint: DataPoint = { name: key };
      value.forEach((value) => {
        Object.keys(value).forEach((key) => {
          if (key !== "name") {
            dataPoint[key] = value[key] as string | number;
          }
        });
      });
      return dataPoint;
    });

    return result;
  }
}

export interface IChartable {
  chartData: Record<string | number | symbol, ChartData> | ChartData;
  loadChartData(cache: [], name: string): void;
  updateChartData(cache: [], name: string): void;
}
