import { DataSeries, DataPoint } from '@sproot/sproot-common/dist/charts/ChartData';

export class ChartData {
  dataSeries: DataSeries;
  readonly limit: number;

  constructor(limit: number, dataSeries?: DataSeries) {
    this.limit = limit;

    if (dataSeries) {
      this.dataSeries = dataSeries;
    } else {
      this.dataSeries = [];
    }
  }

  public addDataPoint(dataPoint: DataPoint): void {
    this.dataSeries.push(dataPoint);
    if (this.dataSeries.length > this.limit) {
      this.dataSeries.shift();
    }
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

  static formatReadingForDisplay(data: string): string {
    return parseFloat(data).toFixed(3);
  }
}

export interface IChartable {
  chartData: Record<string | number | symbol, ChartData> | ChartData;
  loadChartData(): void;
  updateChartData(): void;
}