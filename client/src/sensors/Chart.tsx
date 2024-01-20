import { ChartData } from "@sproot/src/api/ChartData";
import { ReadingType } from "@sproot/src/sensors/SensorBase";
import { LineChart } from "@mantine/charts";

const colors = [
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "grape",
  "pink",
  "red",
  "orange",
  "yellow",
];

interface ChartProps {
  width: number;
  height: number;
  readingType: ReadingType;
  chartData: Record<ReadingType, ChartData[]>;
  sensorNames: string[];
}

export default function Chart({
  readingType,
  chartData,
  sensorNames,
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
      series={sensorNames.map((sensorName, index) => ({
        name: sensorName,
        color: colors[index % colors.length]!,
      }))}
      dotProps={{ r: 0 }}
      withLegend
      withTooltip={false}
      withXAxis
      withYAxis
      xAxisProps={{ dataKey: "name" }}
      yAxisProps={{ domain: ["auto", "auto"] }}
      referenceLines={[]}
      style={{ marginTop: 5, marginBottom: 5, marginLeft: 20, marginRight: 20 }}
      legendProps={{ verticalAlign: "bottom", height: 50 }}
    />
  );
}
