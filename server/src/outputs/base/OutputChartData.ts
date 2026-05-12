import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import {
  IChartable,
  ChartData,
  DataSeries,
  ChartSeries,
} from "@sproot/sproot-common/dist/utility/ChartData";
import { formatDateForChart } from "@sproot/sproot-common/dist/utility/DisplayFormats";

export class OutputChartData implements IChartable {
  chartData: ChartData;
  chartSeries: ChartSeries;
  intervalMinutes: number;
  limit: number;
  constructor(limit: number, intervalMinutes: number, dataSeries?: DataSeries) {
    this.limit = limit;
    this.intervalMinutes = intervalMinutes;
    this.chartData = new ChartData(limit, intervalMinutes, dataSeries);
    this.chartSeries = { name: "", color: "" };
  }

  get(): { data: DataSeries; series: ChartSeries } {
    return {
      data: this.chartData.get(),
      series: this.chartSeries,
    };
  }

  loadChartData(cache: SDBOutputState[], outputName: string): void {
    for (const state of cache) {
      const formattedDate = formatDateForChart(state.logTime);
      const value = this.get().data.findIndex((x) => x.name == formattedDate);
      if (value >= 0 && this.get().data[value]) {
        this.get().data[value]!.units = "%";
        this.get().data[value]![outputName] = state.value;
      }
    }
  }

  loadChartSeries(series: ChartSeries): void {
    this.chartSeries = series;
  }

  updateChartData(cache: SDBOutputState[], outputName: string): void {
    const lastCacheData = cache[cache.length - 1];
    if (lastCacheData) {
      const name = formatDateForChart(lastCacheData.logTime);
      //Add Only if not the same time stamp as the last data point
      if (name != this.chartData.get().slice(-1)[0]?.name) {
        this.chartData.addDataPoint({
          name,
          units: "%",
          [outputName]: lastCacheData.value,
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
        formatDateForChart(
          new Date(new Date(lastCacheData.logTime).getTime() - this.intervalMinutes * 60000),
        )
    ) {
      return true;
    }
    return false;
  }
}
