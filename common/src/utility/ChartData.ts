export interface IChartable {
  chartData: Record<string | number | symbol, ChartData> | ChartData;
  chartSeries: ChartSeries[] | ChartSeries;
  loadChartData(cache: [], name: string, key?: string | number | symbol): void;
  loadChartSeries(series: ChartSeries | ChartSeries[]): void;
  updateChartData(cache: [], name: string, key?: string | number | symbol): void;
}

export class ChartData {
  static cachedEmptyDataSeries: DataSeries = [];
  static cachedEmptyDataSeriesID: string = "";
  readonly limit: number;
  readonly intervalMinutes: number;
  dataSeries: DataSeries;

  constructor(
    limit: number,
    intervalMinutes: number,
    dataSeries?: DataSeries,
    now: Date = new Date(),
  ) {
    this.limit = limit;
    this.intervalMinutes = intervalMinutes;
    if (dataSeries) {
      this.dataSeries = dataSeries;
      while (this.dataSeries.length > limit) {
        this.dataSeries.shift();
      }
    } else {
      this.dataSeries = ChartData.generateEmptyDataSeries(limit, intervalMinutes, now);
    }
  }

  get(): DataSeries {
    return this.dataSeries;
  }

  addDataPoint(dataPoint: DataPoint): void {
    this.dataSeries.push(dataPoint);
    if (this.dataSeries.length > this.limit) {
      this.dataSeries.shift();
    }
  }

  generateTimeSpansFromDataSeries(dataSeries: DataSeries): Record<number, DataSeries> {
    const res = ChartData.generateTimeSpansFromDataSeries(dataSeries, this.intervalMinutes);
    return res;
  }

  static generateTimeSpansFromDataSeries(
    dataSeries: DataSeries,
    interval: number,
  ): Record<number, DataSeries> {
    const res: Record<number, DataSeries> = {};

    res[0] = dataSeries;
    res[6] = dataSeries.slice(Math.floor(-360 / interval));
    res[12] = dataSeries.slice(Math.floor(-720 / interval));
    res[24] = dataSeries.slice(Math.floor(-1440 / interval));
    res[72] = dataSeries.slice(Math.floor(-4320 / interval));
    return res;
  }

  static generateStatsForTimeSpans(
    timeSpans: Record<number, DataSeries>,
  ): Record<number, DataSeriesStats> {
    const res: Record<number, DataSeriesStats> = {};
    Object.entries(timeSpans).forEach(([key, value]) => {
      res[parseInt(key)] = ChartData.generateStatsForDataSeries(value);
    });

    return res;
  }

  static generateStatsForDataSeries(dataSeries: DataSeries): DataSeriesStats {
    return new DataSeriesStats(dataSeries);
  }

  static generateEmptyDataSeries(
    limit: number,
    intervalMinutes: number,
    now: Date = new Date(),
  ): DataSeries {
    const intervalInMs = intervalMinutes * 60000;
    const newDataSeries: DataSeries = [];
    let NMinuteDate = new Date(Math.floor(now.getTime() / intervalInMs) * intervalInMs);

    const newDataId = this.formatDateForChart(NMinuteDate) + limit + intervalMinutes;
    if (newDataId === this.cachedEmptyDataSeriesID) {
      return this.cachedEmptyDataSeries.map((x) => ({ ...x }));
    }
    this.cachedEmptyDataSeriesID = newDataId;

    for (let i = 0; i < limit; i++) {
      newDataSeries.unshift({ name: this.formatDateForChart(NMinuteDate) });
      NMinuteDate = new Date(NMinuteDate.getTime() - intervalInMs);
    }
    this.cachedEmptyDataSeries = newDataSeries;
    return newDataSeries;
  }

  static formatDateForChart(date: Date | string): string {
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

  static shouldUpdateByInterval(
    now: Date,
    intervalInMinutes: number,
    current: Date = new Date(),
  ): boolean {
    const intervalInMs = intervalInMinutes * 60000;
    const NMinuteDate = new Date(Math.floor(current.getTime() / intervalInMs) * intervalInMs);
    if (now.getDate() == NMinuteDate.getDate()) {
      if (now.getHours() == NMinuteDate.getHours()) {
        if (now.getMinutes() == NMinuteDate.getMinutes()) {
          return true;
        }
      }
    }

    return false;
  }

  static filterChartData(chartData: DataSeries, filters: string[]): DataSeries {
    const filteredChartData: DataSeries = [];
    for (const datum of chartData) {
      const cleanObject: DataPoint = {} as DataPoint;
      for (const property in datum) {
        if (filters.includes(property)) {
          continue;
        }
        cleanObject[property] = datum[property]!;
      }
      filteredChartData.push(cleanObject);
    }
    return filteredChartData;
  }
}

export type DataPoint = {
  name: string;
  units?: string;
  [key: string]: number | string;
};

export type DataSeries = DataPoint[];

export type ChartSeries = {
  name: string;
  color: string;
};

export class DataSeriesStats {
  counts: Record<string, number>;
  totals: Record<string, number>;
  minimums: Record<string, number>;
  maximums: Record<string, number>;
  averages: Record<string, number>;
  cumulativeCount: number;
  cumulativeTotal: number;
  cumulativeMin?: number;
  cumulativeMax?: number;
  cumulativeAverage?: number;
  units: string;

  constructor(dataSeries: DataSeries) {
    this.counts = {};
    this.totals = {};
    this.minimums = {};
    this.maximums = {};
    this.averages = {};
    this.cumulativeCount = 0;
    this.cumulativeTotal = 0;
    this.units = "";

    dataSeries.forEach((dataPoint) => {
      const keys = Object.keys(dataPoint);
      keys.forEach((key) => {
        if (key == "name" || key == "units") {
          if (key == "units" && dataPoint[key] != "") {
            this.units = dataPoint[key] as string;
          }
          return;
        }
        if (!this.counts[key]) {
          this.counts[key] = 0;
        }
        if (!this.totals[key]) {
          this.totals[key] = 0;
        }
        if (!this.averages[key]) {
          this.averages[key] = 0;
        }

        // Update counts
        this.counts[key]++;
        this.cumulativeCount++;

        const value = parseFloat(dataPoint[key] as string);
        // Update total
        this.totals[key] += value;
        this.cumulativeTotal += value;

        // Update min if necessary
        if (!this.minimums[key] || value < this.minimums[key]!) {
          if (!this.cumulativeMin || value < this.cumulativeMin) {
            this.cumulativeMin = value;
          }
          this.minimums[key] = value;
        }

        // Update max if necessary
        if (!this.maximums[key] || value > this.maximums[key]!) {
          if (!this.cumulativeMax || value > this.cumulativeMax) {
            this.cumulativeMax = value;
          }
          this.maximums[key] = value;
        }
      });
    });

    this.calculateAverages();
  }

  private calculateAverages() {
    const averages = {} as Record<string, number>;
    Object.keys(this.counts).forEach((key) => {
      averages[key] = this.totals[key]! / this.counts[key]!;
    });
    this.cumulativeAverage = this.cumulativeTotal / this.cumulativeCount;
    this.averages = averages;
  }
}

export const DefaultColors = [
  "#82c91e",
  "#40c057",
  "#12b886",
  "#15aabf",
  "#228be6",
  "#4c6ef5",
  "#7950f2",
  "#be4bdb",
  "#e64980",
  "#fa5252",
  "#fd7e14",
  "#fab005",
  "#868e96",
  "#2e2e2e",
] as const;
