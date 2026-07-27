import { LineChart } from "@mantine/charts";
import { Box, LoadingOverlay, Paper, Text } from "@mantine/core";
import {
  formatDecimalReadingForDisplay,
  formatNumberForDisplay,
  formatDateForDisplay,
  formatTickValue,
} from "@sproot/common/utility/DisplayFormats";
import { useMemo } from "react";
import { ChartSeries, DataSeries } from "../../../requests/chartDataTypes";
import {
  getDownsampleMinutes,
  Aggregate,
  isUnitlessAggregate,
} from "../../../requests/queryTypes";

export interface ReadingsChartProps {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  readingType: string;
  chartRendering: boolean;
  showEmptyState?: boolean;
  showReferenceLines?: boolean;
  allSensorsHidden?: boolean;
  units?: string;
  aggregate?: Aggregate;
  downsample?: string;
  onToggleReferenceLines?: (value: boolean) => void;
}

export default function ReadingsChart({
  dataSeries,
  chartSeries,
  chartRendering,
  showEmptyState,
  showReferenceLines,
  allSensorsHidden,
  units,
  aggregate,
  downsample,
}: ReadingsChartProps) {
  const stats = useMemo(() => getSeriesStats(dataSeries), [dataSeries]);
  const data = useMemo(
    () =>
      dataSeries.map((dataPoint) => {
        const rest = { ...dataPoint };
        delete rest.units;
        return rest;
      }),
    [dataSeries],
  );
  // const shouldRenderDots = data.length <= 200;

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
            <Text c="dimmed">
              {allSensorsHidden
                ? "No sensors selected"
                : "No data found for this interval"}
            </Text>
          ) : null}
        </div>
      ) : (
        <Box>
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
                    units={units || ""}
                    aggregate={aggregate}
                    downsample={downsample ?? undefined}
                    rawTimestamp={rawTimestamp}
                  />
                );
              },
            }}
            mt={12}
            ml={-28}
            curveType="linear"
            h={300}
            data={data}
            withLegend={false}
            withDots={false}
            lineProps={{ activeDot: <ActiveDot /> }}
            withYAxis
            tickLine="xy"
            xAxisProps={{
              dataKey: "name",
              interval: "equidistantPreserveStart",
            }}
            yAxisProps={{
              tickMargin: -5,
              allowDataOverflow: true,
              padding: { top: 5 },
              type: "number",
              domain: ["auto", "auto"],
              tickFormatter: formatTickValue,
            }}
            referenceLines={
              showReferenceLines && stats
                ? [
                    {
                      y: stats.avg,
                      label: `Average: ${formatDecimalReadingForDisplay(String(stats.avg))} ${stats.units || units || ""}`,
                      color: "red",
                      ifOverflow: "extendDomain",
                      labelPosition: "insideTopLeft",
                    },
                    {
                      y: stats.min,
                      label: `Min: ${formatDecimalReadingForDisplay(String(stats.min))} ${stats.units || units || ""}`,
                      color: "blue",
                      ifOverflow: "extendDomain",
                      labelPosition: "insideBottomLeft",
                    },
                    {
                      y: stats.max,
                      label: `Max: ${formatDecimalReadingForDisplay(String(stats.max))} ${stats.units || units || ""}`,
                      color: "green",
                      ifOverflow: "extendDomain",
                      labelPosition: "insideTopLeft",
                    },
                  ]
                : []
            }
            dataKey="name"
            series={chartSeries}
          />
        </Box>
      )}
    </Box>
  );
}

interface ChartTooltipProps {
  label: string;
  payload: { name: string; color: string; value: string }[] | undefined;
  units: string;
  aggregate?: Aggregate | undefined;
  downsample: string | undefined;
  rawTimestamp: string | undefined;
}

function ChartTooltip({
  label,
  payload,
  units,
  aggregate,
  downsample,
  rawTimestamp,
}: ChartTooltipProps) {
  if (!payload) {
    return null;
  }

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
        <Text
          key={String(item["name"])}
          c={String(item["color"] ?? "")}
          fz="sm"
        >
          {String(item["name"])}: {formatNumberForDisplay(item["value"] ?? "")}
          {!isUnitlessAggregate(aggregate ?? "avg") && units ? ` ${units}` : ""}
        </Text>
      ))}
    </Paper>
  );
}

function getSeriesStats(dataSeries: DataSeries) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let total = 0;
  let count = 0;
  let detectedUnits = "";

  for (const dataPoint of dataSeries) {
    if (!detectedUnits && typeof dataPoint.units === "string") {
      detectedUnits = dataPoint.units;
    }

    for (const [key, value] of Object.entries(dataPoint)) {
      if (key === "name" || key === "units" || typeof value !== "number") {
        continue;
      }

      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }

      total += value;
      count++;
    }
  }

  if (count === 0) {
    return null;
  }

  return {
    avg: total / count,
    min,
    max,
    units: detectedUnits,
  };
}

function ActiveDot(props: any) {
  if (props.cy == null || props.cy < 0 || props.cy > 300) {
    return null;
  }
  return <circle cx={props.cx} cy={props.cy} r={5} fill={props.fill} />;
}
