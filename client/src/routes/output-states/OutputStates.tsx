import { Box, Paper, SegmentedControl, Checkbox } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import StatesChartContainer from "./components/StatesChartContainer";
import { startTransition, useEffect, useState } from "react";
import { outputStateToggledZonesKey } from "../utility/LocalStorageKeys";
import ZoneAccordion from "./components/ZoneAccordion";

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
  const [chartRendering, setChartRendering] = useState(true);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customRange, setCustomRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

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
            toggledDeviceZones={deviceZoneToggleStates}
            customTimeRange={useCustomRange ? customRange : null}
          />
          <Checkbox
            checked={useCustomRange}
            onChange={(e) => {
              setUseCustomRange(e.currentTarget.checked);
              if (!e.currentTarget.checked) {
                setCustomRange(null);
              }
            }}
            label="Custom range"
            size="xs"
            mb="xs"
          />

          {useCustomRange ? (
            <DatePicker
              type="range"
              value={
                customRange
                  ? [customRange.start, customRange.end]
                  : [null, null]
              }
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setCustomRange({ start: dates[0], end: dates[1] });
                }
              }}
              size="xs"
              mb="xs"
            />
          ) : (
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
          )}
          <ZoneAccordion
            deviceZoneToggleStates={deviceZoneToggleStates}
            setDeviceZoneToggleStates={setDeviceZoneToggleStates}
          />
        </Paper>
      </Box>
    </>
  );
}
