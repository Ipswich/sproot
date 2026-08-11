import { Box, Flex, Paper } from "@mantine/core";
import { Center, Loader } from "@mantine/core";
import { Suspense, lazy, startTransition, useState } from "react";
import { outputStateToggledZonesKey } from "../utility/LocalStorageKeys";
import ZoneAccordion from "./components/ZoneAccordion";
import type { Aggregate } from "../../requests/queryTypes";

const StatesChartContainer = lazy(() => import("./components/StatesChartContainer"));
const ChartQueryControls = lazy(() => import("../common/ChartQueryControls"));

function RouteSectionLoader() {
  return (
    <Center mih={120}>
      <Loader color="teal" type="bars" size="md" />
    </Center>
  );
}

export default function OutputStates() {
  const [deviceZoneToggleStates, setDeviceZoneToggleStates] = useState(
    JSON.parse(
      localStorage.getItem(outputStateToggledZonesKey()) ?? "[]",
    ) as string[],
  );
  const [chartInterval, setChartInterval] = useState(
    localStorage.getItem("outputChartInterval") ?? "24",
  );
  const [segmentedControlValue, setSegmentedControlValue] =
    useState(chartInterval);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customRange, setCustomRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [aggregate, setAggregate] = useState(
    (localStorage.getItem("outputChartAggregate") ?? "avg") as Aggregate,
  );
  const [downsample, setDownsample] = useState(
    localStorage.getItem("outputChartDownsample") ?? "auto",
  );
  const [percentile, setPercentile] = useState(
    Number(localStorage.getItem("outputChartPercentile") ?? "95"),
  );
  const valueSuffix = aggregate === "count" ? "" : "%";

  return (
    <>
      <Box pos="relative">
        <Paper shadow="sm" px="md" py="xs" radius="md" withBorder>
          <Flex my={-12}>
            <h2>History</h2>
            <h5>{valueSuffix}</h5>
          </Flex>
          <Suspense fallback={<RouteSectionLoader />}>
            <StatesChartContainer
              chartInterval={chartInterval}
              toggledDeviceZones={deviceZoneToggleStates}
              customTimeRange={useCustomRange ? customRange : null}
              aggregate={aggregate}
              downsampleSelection={downsample}
              percentile={percentile}
              valueSuffix={valueSuffix}
            />
          </Suspense>
          <Suspense fallback={<RouteSectionLoader />}>
            <ChartQueryControls
              chartInterval={segmentedControlValue}
              onChartIntervalChange={(value) => {
                startTransition(() => {
                  localStorage.setItem("outputChartInterval", value);
                  setSegmentedControlValue(value);
                  setChartInterval(value);
                });
              }}
              useCustomRange={useCustomRange}
              onUseCustomRangeChange={(value) => {
                startTransition(() => {
                  setUseCustomRange(value);
                });
              }}
              customRange={customRange}
              onCustomRangeChange={(value) => {
                startTransition(() => {
                  setCustomRange(value);
                });
              }}
              aggregate={aggregate}
              onAggregateChange={(value) => {
                startTransition(() => {
                  localStorage.setItem("outputChartAggregate", value);
                  setAggregate(value);
                });
              }}
              downsample={downsample}
              onDownsampleChange={(value) => {
                startTransition(() => {
                  localStorage.setItem("outputChartDownsample", value);
                  setDownsample(value);
                });
              }}
              percentile={percentile}
              onPercentileChange={(value) => {
                startTransition(() => {
                  localStorage.setItem("outputChartPercentile", value.toString());
                  setPercentile(value);
                });
              }}
            />
          </Suspense>
          <ZoneAccordion
            deviceZoneToggleStates={deviceZoneToggleStates}
            setDeviceZoneToggleStates={setDeviceZoneToggleStates}
          />
        </Paper>
      </Box>
    </>
  );
}
