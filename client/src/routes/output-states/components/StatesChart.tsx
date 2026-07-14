import { LineChart } from "@mantine/charts";
import { Box, LoadingOverlay, Paper, Text } from "@mantine/core";
import { useMemo } from "react";
import { DataSeries, ChartSeries } from "../../../requests/chartDataTypes";

export interface StatesChartProps {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  chartRendering: boolean;
  showEmptyState?: boolean;
  valueSuffix?: string;
}

export default function StatesChart({
  dataSeries,
  chartSeries,
  chartRendering,
  showEmptyState,
  valueSuffix = "%",
}: StatesChartProps) {
  const data = useMemo(
    () =>
      dataSeries.map((dataPoint) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { units: _, ...rest } = dataPoint;
        return rest;
      }),
    [dataSeries],
  );

  return (
    <Box pos="relative">
      <LoadingOverlay
        style={{ height: "100%" }}
        visible={chartRendering}
        zIndex={1000}
        loaderProps={{ color: "teal", type: "bars", size: "lg" }}
      />
      {showEmptyState ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 300,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          {!chartRendering ? (
            <Text c="dimmed">No data found for this interval</Text>
          ) : null}
        </div>
      ) : (
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
                valueSuffix={valueSuffix}
              />
            ),
          }}
          mt={12}
          ml={-28}
          curveType="linear"
          h={300}
          withDots={false}
          lineProps={{ activeDot: <ActiveDot /> }}
          data={data}
          withLegend={false}
          withXAxis
          withYAxis
          tickLine="xy"
          xAxisProps={{
            dataKey: "name",
            interval: "equidistantPreserveStart",
          }}
          yAxisProps={{
            padding: { top: 5 },
            type: "number",
            domain: [0, 100],
          }}
          dataKey="name"
          series={chartSeries ?? []}
        />
      )}
    </Box>
  );
}

interface ChartTooltipProps {
  label: string;
  payload:
    | Record<string, { name: string; color: string; value: string }>[]
    | undefined;
  valueSuffix: string;
}

function ChartTooltip({ label, payload, valueSuffix }: ChartTooltipProps) {
  if (!payload) return null;

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md" opacity="80%">
      <Text fw={500} mb={5}>
        {label}
      </Text>
      {payload.map((item) => (
        <Text key={String(item["name"])} c={item["color"]!} fz="sm">
          {String(item["name"])}: {String(item["value"])}
          {valueSuffix}
        </Text>
      ))}
    </Paper>
  );
}

function ActiveDot(props: any) {
  if (props.cy == null || props.cy < 0 || props.cy > 300) {
    return null;
  }
  return <circle cx={props.cx} cy={props.cy} r={5} fill={props.fill} />;
}
