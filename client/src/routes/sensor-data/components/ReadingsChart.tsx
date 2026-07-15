import { LineChart } from "@mantine/charts";
import { Box, LoadingOverlay, Paper, Text } from "@mantine/core";
import { formatDecimalReadingForDisplay } from "@sproot/sproot-common/src/utility/DisplayFormats";
import { useMemo } from "react";
import { ChartSeries, DataSeries } from "../../../requests/chartDataTypes";

export interface ReadingsChartProps {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  readingType: string;
  chartRendering: boolean;
  showEmptyState?: boolean;
  showReferenceLines?: boolean;
  allSensorsHidden?: boolean;
  units?: string;
}

export default function ReadingsChart({
  dataSeries,
  chartSeries,
  chartRendering,
  showEmptyState,
  showReferenceLines,
  allSensorsHidden,
  units,
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
              content: ({ label, payload }) => (
                <ChartTooltip
                  label={label}
                  payload={
                    (payload || []) as Record<
                      string,
                      { name: string; color: string; value: string }
                    >[]
                  }
                  units={units || ""}
                />
              ),
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
              allowDataOverflow: true,
              padding: { top: 5 },
              type: "number",
              domain: ["auto", "auto"],
            }}
            referenceLines={
              showReferenceLines && stats
                ? [
                    {
                      y: stats.avg,
                      label: `Average: ${formatDecimalReadingForDisplay(String(stats.avg))}${stats.units || units || ""}`,
                      color: "red",
                      ifOverflow: "extendDomain",
                      labelPosition: "insideTopLeft",
                    },
                    {
                      y: stats.min,
                      label: `Min: ${formatDecimalReadingForDisplay(String(stats.min))}${stats.units || units || ""}`,
                      color: "blue",
                      ifOverflow: "extendDomain",
                      labelPosition: "insideBottomLeft",
                    },
                    {
                      y: stats.max,
                      label: `Max: ${formatDecimalReadingForDisplay(String(stats.max))}${stats.units || units || ""}`,
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
  payload:
    | Record<string, { name: string; color: string; value: string }>[]
    | undefined;
  units: string;
}

function ChartTooltip({ label, payload, units }: ChartTooltipProps) {
  if (!payload) {
    return null;
  }

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md" opacity="80%">
      <Text fw={500} mb={5}>
        {label}
      </Text>
      {payload.map((item) => (
        <Text
          key={String(item["name"])}
          c={String(item["color"] ?? "")}
          fz="sm"
        >
          {String(item["name"])}: {String(item["value"])}
          {units}
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
