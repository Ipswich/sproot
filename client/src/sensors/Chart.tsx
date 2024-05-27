import { LookbackData } from "@sproot/sproot-common/src/api/ChartData";
import { LineChart } from "@mantine/charts";
import { Box, LoadingOverlay } from "@mantine/core";
import { useEffect } from "react";
import { Paper, Text } from "@mantine/core";

interface ChartProps {
  lookback: LookbackData;
  chartSeries: { name: string; color: string }[];
  chartRendering: boolean;
  setChartRendering: (value: boolean) => void;
}

export default function Chart({
  lookback,
  chartSeries,
  chartRendering,
  setChartRendering,
}: ChartProps) {
  useEffect(() => {
    setChartRendering(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lookback) {
    return null;
  }
  const unit = lookback.chartData[0]?.units ?? "";
  return (
    <Box pos="relative">
      <LoadingOverlay
        style={{ height: "100%" }}
        visible={chartRendering}
        zIndex={1000}
        loaderProps={{ color: "teal", type: "bars", size: "lg" }}
      />
      <LineChart
        tooltipProps={{
          position: {},
          content: ({ label, payload }) => (
            <ChartTooltip
              label={label}
              payload={
                (payload || []) as Record<
                  string,
                  { name: string; color: string; value: string }
                >[]
              }
            />
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
        tickLine="xy"
        xAxisProps={{ dataKey: "name", interval: "equidistantPreserveStart" }}
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
    </Box>
  );
}

interface ChartTooltipProps {
  label: string;
  payload:
    | Record<string, { name: string; color: string; value: string }>[]
    | undefined;
}

function ChartTooltip({ label, payload }: ChartTooltipProps) {
  if (!payload) return null;

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md" opacity="80%">
      <Text fw={500} mb={5}>
        {label}
      </Text>
      {payload.map((item) => (
        <Text key={String(item["name"])} c={item["color"]!} fz="sm">
          {String(item["name"])}: {String(item["value"])}
        </Text>
      ))}
    </Paper>
  );
}
