import { LineChart } from "@mantine/charts";
import { Box, LoadingOverlay, Paper, Text } from "@mantine/core";
import { ISensorBase } from "@sproot/sensors/ISensorBase";
import {
  DataSeries,
  ChartSeries,
  ChartData,
} from "@sproot/sproot-common/src/utility/ChartData";
import { formatDecimalReadingForDisplay } from "@sproot/sproot-common/src/utility/DisplayFormats";
import { ResponsiveContainer } from "recharts";

export interface ReadingsChartProps {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  readingType: string
  chartRendering: boolean;
}

export default function ReadingsChart({
  dataSeries,
  chartSeries,
  readingType,
  chartRendering,
}: ReadingsChartProps) {
  const stats = ChartData.generateStatsForDataSeries(dataSeries);
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
                units={stats.units}
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
          xAxisProps={{ dataKey: "name", interval: "equidistantPreserveStart" }}
          yAxisProps={{
            allowDataOverflow: true,
            padding: { top: 5 },
            type: "number",
            domain: ["auto", "auto"],
          }}
          referenceLines={[
            {
              y: stats.cumulativeAverage!,
              label: `Average: ${formatDecimalReadingForDisplay(String(stats.cumulativeAverage!))}${stats.units}`,
              color: "red",
              ifOverflow: "extendDomain",
              labelPosition: "insideTopLeft",
            },
            {
              y: stats.cumulativeMin!,
              label: `Min: ${formatDecimalReadingForDisplay(String(stats.cumulativeMin!))}${stats.units}`,
              color: "blue",
              ifOverflow: "extendDomain",
              labelPosition: "insideBottomLeft",
            },
            {
              y: stats.cumulativeMax!,
              label: `Max: ${formatDecimalReadingForDisplay(String(stats.cumulativeMax!))}${stats.units}`,
              color: "green",
              ifOverflow: "extendDomain",
              labelPosition: "insideTopLeft",
            },
          ]}
          dataKey="sensorName"
          series={chartSeries ?? []}
        ></LineChart>
      </ResponsiveContainer>
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

function ChartTooltip({ label, payload, units, readingType }: ChartTooltipProps) {
  if (!payload) return null;

  const order = (JSON.parse(localStorage.getItem(`${readingType}-sensorDataOrder`) ?? "[]") as ISensorBase[]).map(s => s.name );
  const orderNames = Array.isArray(order) ? order : [];
  const indexMap = new Map(orderNames.map((n, i) => [n, i]));

  // Reorder payload to match orderNames. Items not in orderNames go to the end.
  payload = [...payload].sort((a, b) => {
    const nameA = String((a)["name"]);
    const nameB = String((b)["name"]);
    const idxA = indexMap.has(nameA) ? indexMap.get(nameA)! : Number.MAX_SAFE_INTEGER;
    const idxB = indexMap.has(nameB) ? indexMap.get(nameB)! : Number.MAX_SAFE_INTEGER;
    return idxA - idxB || nameA.localeCompare(nameB);
  });

  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md" opacity="80%">
      <Text fw={500} mb={5}>
        {label}
      </Text>
      {payload
        .map((item) => (
          <Text key={String(item["name"])} c={item["color"]!} fz="sm">
            {String(item["name"])}: {String(item["value"] + String(units))}
          </Text>
        ))}
    </Paper>
  );
}
