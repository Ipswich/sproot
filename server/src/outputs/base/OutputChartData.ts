import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { IChartable, ChartData, DataSeries } from "@sproot/sproot-common/dist/utility/IChartable";

export class OutputChartData implements IChartable {
  chartData: ChartData;
  intervalMinutes: number;
  limit: number;
  constructor(limit: number, intervalMinutes: number, dataSeries?: DataSeries) {
    this.limit = limit;
    this.intervalMinutes = intervalMinutes;
    this.chartData = new ChartData(limit, intervalMinutes, dataSeries);
  }

  get(): DataSeries {
    return this.chartData.get();
  }

  loadChartData(cache: SDBOutputState[], outputName: string): void {
    for (const state of cache) {
      const formattedDate = ChartData.formatDateForChart(state.logTime);
      const value = this.get().findIndex((x) => x.name == formattedDate);
      if (value >= 0 && this.get()[value]) {
        this.get()[value]![outputName] = state.value.toString();
      }
    }
  }

  updateChartData(cache: SDBOutputState[], outputName: string): void {
    const lastCacheData = cache[cache.length - 1];
    if (lastCacheData) {
      const name = ChartData.formatDateForChart(lastCacheData.logTime);
      //Add Only if not the same time stamp as the last data point
      if (name != this.chartData.get().slice(-1)[0]?.name) {
        this.chartData.addDataPoint({
          name,
          [outputName]: lastCacheData.value.toString(),
        });
      }
    }
  }

  shouldUpdateChartData(lastCacheData?: SDBOutputState): boolean {
    const lastChartData = this.chartData.get().slice(-1)[0];
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
