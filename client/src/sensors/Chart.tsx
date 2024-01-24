import { LookbackData } from "@sproot/sproot-common/src/api/ChartData";
import { LineChart } from "@mantine/charts";
import { Paper, Text, Tooltip } from "@mantine/core";

interface ChartProps {
  lookback: LookbackData;
  chartSeries: { name: string; color: string }[];
}

export default function Chart({ lookback, chartSeries }: ChartProps) {
  if (!lookback) {
    return null;
  }
  const unit = lookback.chartData[0]?.units ?? "";
  return (
    <LineChart
      tooltipProps={{
        content: ({ label, payload }) => (
          <ChartTooltip label={label} payload={payload} />
        ),
      }}
      h={300}
      data={lookback.chartData.map((data) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { units: _, ...rest } = data;
        return rest;
      })}
      // unit={unit}
      dataKey="sensorName"
      series={chartSeries}
      dotProps={{ r: 0 }}
      withLegend={false}
      withTooltip={true}
      withXAxis
      withYAxis
      xAxisProps={{ dataKey: "name" }}
      yAxisProps={{ domain: ["auto", "auto"] }}
      referenceLines={[
        {
          y: lookback.average,
          label: `Average: ${lookback.average}${unit}`,
          color: "red",
        },
        {
          y: lookback.min,
          label: `Min: ${lookback.min}${unit}`,
          color: "blue",
        },
        {
          y: lookback.max,
          label: `Max: ${lookback.max}${unit}`,
          color: "green",
        },
      ]}
      style={{ marginTop: 5, marginBottom: 5 }}
    />
  );
}

interface ChartTooltipProps {
  label: string;
  payload:
    | Record<string, { name: string; color: string; value: string }>[]
    | undefined;
}

function OtherChartToolTip({ label, payload }: ChartTooltipProps) {
  if (!payload) return null;

  return <Tooltip></Tooltip>;
}

function ChartTooltip({ label, payload }: ChartTooltipProps) {
  if (!payload) return null;

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md">
      <Text fw={500} mb={5}>
        {label}
      </Text>
      {payload.map((item) => (
        <Text key={item["name"]} c={item["color"]} fz="sm">
          {item["name"]}: {item["value"]}
        </Text>
      ))}
    </Paper>
  );
}
