import { ChartData } from "@sproot/utility/IChartable";
import Chart from "./Chart";

interface ChartContainerProps {
  chartData: ChartData;
  chartSeries: { name: string; color: string }[];
  chartRendering: boolean;
  setChartRendering: (value: boolean) => void;
}

export default function ChartContainer({
  chartData,
  chartSeries,
  chartRendering,
  setChartRendering,
}: ChartContainerProps) {
  return (
    <Chart
      chartData={chartData}
      chartSeries={chartSeries}
      chartRendering={chartRendering}
      setChartRendering={setChartRendering}
    />
  );
}
