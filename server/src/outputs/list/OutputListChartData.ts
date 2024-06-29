import {
  IChartable,
  ChartData,
  DataSeries,
  ChartSeries,
} from "@sproot/sproot-common/dist/utility/ChartData";

class OutputListChartData implements IChartable {
  chartData: ChartData;
  chartSeries: ChartSeries[];
  #limit;
  #interval;

  constructor(limit: number, interval: number) {
    this.chartData = new ChartData(limit, interval);
    this.chartSeries = [];
    this.#limit = limit;
    this.#interval = interval;
  }

  get(): { data: DataSeries; series: ChartSeries[] } {
    return { data: this.chartData.get(), series: this.chartSeries };
  }

  loadChartData(cache: DataSeries[], _name: string): void {
    const combinedData = ChartData.combineDataSeries([...cache]);
    this.chartData = new ChartData(this.#limit, this.#interval, combinedData);
  }

  loadChartSeries(series: ChartSeries[]): void {
    this.chartSeries = series;
  }

  updateChartData(cache: DataSeries[], _name: string): void {
    const newValues = cache
      .map((dataSeries) => dataSeries[dataSeries.length - 1]!)
      .filter((value) => value !== undefined);
    const newChartData = ChartData.combineDataSeries([newValues]);
    //No duplicate time stamps
    if (
      newChartData[0] !== undefined &&
      newChartData[0].name != this.chartData.get().slice(-1)[0]?.name
    ) {
      this.chartData.addDataPoint(newChartData[0]);
    }
  }
}

export { OutputListChartData };
