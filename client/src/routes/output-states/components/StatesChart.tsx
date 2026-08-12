import { LineChart } from "@mantine/charts";
import { Box, LoadingOverlay, Paper, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  formatNumberForDisplay,
  formatDateForDisplay,
  formatTickValue,
} from "@sproot/common/utility/DisplayFormats";
import { useMemo } from "react";
import { DataSeries, ChartSeries } from "../../../requests/chartDataTypes";
import {
  getDownsampleMinutes,
  Aggregate,
  isUnitlessAggregate,
} from "../../../requests/queryTypes";

export interface StatesChartProps {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  chartRendering: boolean;
  showEmptyState?: boolean;
  valueSuffix?: string;
  aggregate?: Aggregate;
  downsample?: string;
}

export default function StatesChart({
  dataSeries,
  chartSeries,
  chartRendering,
  showEmptyState,
  valueSuffix = "%",
  aggregate,
  downsample,
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
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <Box pos="relative">
      <LoadingOverlay
        style={{ height: "100%", pointerEvents: "none" }}
        visible={chartRendering}
        zIndex={90}
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
            content: (props: any) => {
              const rawTimestamp = props.payload?.[0]?.payload?.rawTimestamp;
              return (
                <ChartTooltip
                  label={props.label}
                  payload={
                    (props.payload || []) as {
                      name: string;
                      color: string;
                      value: string;
                    }[]
                  }
                  valueSuffix={valueSuffix}
                  aggregate={aggregate}
                  downsample={downsample ?? undefined}
                  rawTimestamp={rawTimestamp}
                />
              );
            },
          }}
          accessibilityLayer={!isMobile}
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
            tickMargin: -5,
            dataKey: "name",
            interval: "equidistantPreserveStart",
          }}
          yAxisProps={{
            padding: { top: 5 },
            type: "number",
            domain: [0, 100],
            tickFormatter: formatTickValue,
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
  payload: { name: string; color: string; value: string }[] | undefined;
  valueSuffix: string;
  aggregate?: Aggregate | undefined;
  downsample: string | undefined;
  rawTimestamp: string | undefined;
}

function ChartTooltip({
  label,
  payload,
  valueSuffix,
  aggregate,
  downsample,
  rawTimestamp,
}: ChartTooltipProps) {
  if (!payload) return null;

  let headerText = label;
  if (downsample && getDownsampleMinutes(downsample) > 1 && rawTimestamp) {
    const bucketStart = new Date(rawTimestamp);
    const intervalMs = getDownsampleMinutes(downsample) * 60 * 1000;
    const bucketEnd = new Date(bucketStart.getTime() + intervalMs);
    headerText = `${formatDateForDisplay(bucketStart)} - ${formatDateForDisplay(bucketEnd)}`;
  }

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md" opacity="80%">
      <Text fw={500} mb={5}>
        {headerText}
      </Text>
      {payload.map((item) => (
        <Text key={String(item["name"])} c={item["color"]!} fz="sm">
          {String(item["name"])}: {formatNumberForDisplay(item["value"] ?? "")}
          {!isUnitlessAggregate(aggregate ?? "avg") ? valueSuffix : ""}
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
