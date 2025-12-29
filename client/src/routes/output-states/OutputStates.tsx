import { Box, Paper, SegmentedControl } from "@mantine/core";
import StatesChartContainer from "./components/StatesChartContainer";
import { startTransition, useEffect, useState } from "react";
import { outputStateToggledGroupsKey } from "../utility/LocalStorageKeys";
import GroupAccordion from "./components/GroupAccordion";

export default function OutputStates() {
  const [deviceGroupToggleStates, setDeviceGroupToggleStates] = useState(
    JSON.parse(
      localStorage.getItem(outputStateToggledGroupsKey()) ?? "[]",
    ) as string[],
  );
  const [chartInterval, setChartInterval] = useState(
    localStorage.getItem("outputChartInterval") ?? "24",
  );
  const [segmentedControlValue, setSegmentedControlValue] =
    useState(chartInterval);
  const [chartRendering, setChartRendering] = useState(true);

  useEffect(() => {
    setChartRendering(false);
  }, [chartInterval]);

  return (
    <>
      <Box pos="relative">
        <Paper shadow="sm" px="md" py="xs" radius="md" withBorder>
          <StatesChartContainer
            chartInterval={chartInterval}
            chartRendering={chartRendering}
            setChartRendering={setChartRendering}
            toggledDeviceGroups={deviceGroupToggleStates}
          />
          <div style={{ height: "40px", marginTop: "8px" }}>
            <SegmentedControl
              defaultValue={segmentedControlValue}
              value={segmentedControlValue}
              onChange={(value) => {
                localStorage.setItem("outputChartInterval", value);
                setSegmentedControlValue(value);
                setChartRendering(true);
                startTransition(() => {
                  setChartInterval(value);
                });
              }}
              color="blue"
              fullWidth
              size="xs"
              radius="md"
              data={[
                { label: "6 Hours", value: "6" },
                { label: "12 Hours", value: "12" },
                { label: "1 Day", value: "24" },
                { label: "3 Days", value: "72" },
                { label: "1 Week", value: "0" },
              ]}
            />
          </div>
          <GroupAccordion
            deviceGroupToggleStates={deviceGroupToggleStates}
            setDeviceGroupToggleStates={setDeviceGroupToggleStates}
          />
        </Paper>
      </Box>
    </>
  );
}
