import { LineChart } from "@mantine/charts";
import { Box, LoadingOverlay, Paper, Text } from "@mantine/core";
import {
  DataSeries,
  ChartSeries,
} from "@sproot/sproot-common/src/utility/ChartData";
import { ResponsiveContainer } from "recharts";

export interface StatesChartProps {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  chartRendering: boolean;
}

export default function StatesChart({
  dataSeries,
  chartSeries,
  chartRendering,
}: StatesChartProps) {
  const data = dataSeries.map((data) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { units: _, ...rest } = data;
    return rest;
  });

  return (
    <Box pos="relative">
      <LoadingOverlay
        style={{ height: "100%" }}
        visible={chartRendering}
        zIndex={1000}
        loaderProps={{ color: "teal", type: "bars", size: "lg" }}
      />
      <ResponsiveContainer height="300">
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
          mt={12}
          ml={-28}
          curveType="linear"
          h={300}
          dotProps={{ r: 0 }}
          data={data}
          withLegend={false}
          withXAxis
          withYAxis
          tickLine="xy"
          xAxisProps={{ dataKey: "name", interval: "equidistantPreserveStart" }}
          yAxisProps={{ type: "number", domain: [0, 100] }}
          // unit={unit}
          dataKey="outputName"
          series={chartSeries ?? []}
        />
      </ResponsiveContainer>
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
          {String(item["name"])}: {String(item["value"] + "%")}
        </Text>
      ))}
    </Paper>
  );
}
