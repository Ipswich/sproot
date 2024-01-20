import { ChartData } from "@sproot/src/api/ChartData";
import { ReadingType } from "@sproot/src/sensors/SensorBase";
import { LineChart } from "@mantine/charts";

interface ChartProps {
  width: number;
  height: number;
  readingType: ReadingType;
  chartData: Record<ReadingType, ChartData[]>;
  chartSeries: { name: string; color: string }[];
  sensorNames: string[];
}

export default function Chart({
  readingType,
  chartData,
  chartSeries,
}: ChartProps) {
  if (
    !chartData[readingType as ReadingType] ||
    !chartData[readingType as ReadingType]![0]
  ) {
    return null;
  }
  const unit = chartData[readingType as ReadingType][0]?.units ?? "";
  return (
    <LineChart
      h={300}
      data={chartData[readingType as ReadingType]!}
      unit={unit}
      dataKey="sensorName"
      series={chartSeries}
      dotProps={{ r: 0 }}
      withLegend={false}
      withTooltip={false}
      withXAxis
      withYAxis
      xAxisProps={{ dataKey: "name" }}
      yAxisProps={{ domain: ["auto", "auto"] }}
      referenceLines={[]}
      style={{ marginTop: 5, marginBottom: 5 }}
    />
  );
}
