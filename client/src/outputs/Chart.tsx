import { LineChart } from "@mantine/charts";
import { Box, LoadingOverlay } from "@mantine/core";
// import { Paper, Text } from "@mantine/core";
import { ChartData } from "@sproot/sproot-common/src/utility/IChartable";

export interface OutputChartProps {
  chartData: ChartData;
  chartSeries: { name: string; color: string }[];
  chartRendering: boolean;
  setChartRendering: (value: boolean) => void;
}

export default function OutputChart({
  chartData,
  chartSeries,
  chartRendering,
}: OutputChartProps) {
  if (!chartData) {
    return null;
  }

  return (
    <Box pos="relative">
      <LoadingOverlay
        style={{ height: "100%" }}
        visible={chartRendering}
        zIndex={1000}
        loaderProps={{ color: "teal", type: "bars", size: "lg" }}
      />
      <LineChart
        // tooltipProps={{
        //   position: {},
        //   content: ({ label, payload }) => (
        //     <ChartTooltip
        //       label={label}
        //       payload={
        //         (payload || []) as Record<
        //           string,
        //           { name: string; color: string; value: string }
        //         >[]
        //       }
        //     />
        //   ),
        // }}
        curveType="linear"
        h={300}
        dotProps={{ r: 0 }}
        data={chartData.dataSeries.map((data) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { units: _, ...rest } = data;
          return rest;
        })}
        withLegend={false}
        withXAxis
        withYAxis
        xAxisProps={{ dataKey: "name" }}
        yAxisProps={{ domain: [0, 100] }}
        // unit={unit}
        dataKey="outputName"
        series={chartSeries}
      />
    </Box>
  );
}
