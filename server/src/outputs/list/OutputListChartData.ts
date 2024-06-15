import { IChartable, ChartData, DataSeries } from "@sproot/sproot-common/dist/utility/ChartData";

class OutputListChartData implements IChartable {
  chartData: ChartData;
  #limit;
  #interval;

  constructor(limit: number, interval: number) {
    this.chartData = new ChartData(limit, interval);
    this.#limit = limit;
    this.#interval = interval;
  }

  loadChartData(cache: DataSeries[], _name: string): void {
    const combinedData = ChartData.combineDataSeries([...cache]);
    this.chartData = new ChartData(this.#limit, this.#interval, combinedData);
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
