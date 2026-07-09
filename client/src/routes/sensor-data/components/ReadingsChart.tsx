import { LineChart } from "@mantine/charts";
import { Box, Group, LoadingOverlay, Paper, Switch, Text } from "@mantine/core";
import { DataSeries, ChartSeries } from "../../../requests/chartDataTypes";
import { formatDecimalReadingForDisplay } from "@sproot/sproot-common/src/utility/DisplayFormats";
import { ResponsiveContainer } from "recharts";

export interface ReadingsChartProps {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  readingType: string;
  chartRendering: boolean;
  showEmptyState?: boolean;
  showReferenceLines?: boolean;
  onToggleReferenceLines?: (show: boolean) => void;
  units?: string;
}

export default function ReadingsChart({
  dataSeries,
  chartSeries,
  readingType,
  chartRendering,
  showEmptyState,
  showReferenceLines,
  onToggleReferenceLines,
  units,
}: ReadingsChartProps) {
  const stats = getSeriesStats(dataSeries);
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
          <Text c="dimmed">No data found for this interval</Text>
        </div>
      ) : (
        <Box>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>
              {readingType}
            </Text>
            {onToggleReferenceLines && (
              <Switch
                size="xs"
                label={showReferenceLines ? "Hide stats" : "Show stats"}
                checked={showReferenceLines}
                onChange={(e) =>
                  onToggleReferenceLines(e.currentTarget.checked)
                }
              />
            )}
          </Group>
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
                    units={units || ""}
                    readingType={readingType}
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
              series={chartSeries ?? []}
            ></LineChart>
          </ResponsiveContainer>
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
  readingType: string;
}

function ChartTooltip({
  label,
  payload,
  units,
  readingType: _readingType,
}: ChartTooltipProps) {
  if (!payload) return null;

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md" opacity="80%">
      <Text fw={500} mb={5}>
        {label}
      </Text>
      {payload.map((item) => (
        <Text key={String(item["name"])} c={item["color"]!} fz="sm">
          {String(item["name"])}: {String(item["value"] + String(units))}
        </Text>
      ))}
    </Paper>
  );
}

function getSeriesStats(dataSeries: DataSeries) {
  const values = dataSeries.flatMap((dataPoint) =>
    Object.entries(dataPoint)
      .filter(
        ([key, value]) =>
          key !== "name" && key !== "units" && typeof value === "number",
      )
      .map(([, value]) => value as number),
  );

  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    avg: total / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    units:
      (dataSeries.find((dataPoint) => dataPoint.units)?.units as
        string | undefined) ?? "",
  };
}
