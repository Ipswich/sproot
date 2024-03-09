import { ChartData } from "@sproot/utility/IChartable";
import Chart from "./Chart";
import { useTransition } from "react";

interface ChartContainerProps {
  chartData: ChartData;
  chartSeries: { name: string; color: string }[];
  chartRendering: boolean;
  setChartRendering: (value: boolean) => void;
}

export default function ChartContainer({ chartData, chartSeries, chartRendering, setChartRendering }: ChartContainerProps) {
  const [_, startTransition] = useTransition();

  return (
    <Chart
      chartData={chartData}
      chartSeries={chartSeries}
      chartRendering={chartRendering}
      setChartRendering={setChartRendering}
    />
  );

}