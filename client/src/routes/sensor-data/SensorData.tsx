import { useState, useTransition } from "react";
import { Box, Button, Flex, Group, Paper, Switch } from "@mantine/core";
import { ReadingType, Units } from "@sproot/common/sensors/ReadingType";
import type { Aggregate } from "../../requests/queryTypes";
import { useLoaderData } from "react-router-dom";
import ReadingsChartContainer from "./components/ReadingsChartContainer";
import SensorTableAccordion from "./components/SensorTableAccordion";
import ChartQueryControls from "../common/ChartQueryControls";
import {
  sensorsToggledKey,
  sensorToggledDeviceZonesKey,
} from "../utility/LocalStorageKeys";

export default function SensorData() {
  const readingTypeString = useLoaderData() as string;

  const [chartInterval, setChartInterval] = useState(
    localStorage.getItem("sensorChartInterval") ?? "24",
  );
  const [segmentedControlValue, setSegmentedControlValue] =
    useState(chartInterval);
  const [useAlternateUnits, setAlternateUnits] = useState(
    localStorage.getItem(`${readingTypeString}-useAlternateUnits`) === "true",
  );
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customRange, setCustomRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [aggregate, setAggregate] = useState(
    (localStorage.getItem("sensorChartAggregate") ?? "avg") as Aggregate,
  );
  const [downsample, setDownsample] = useState(
    localStorage.getItem("sensorChartDownsample") ?? "auto",
  );
  const [percentile, setPercentile] = useState(
    Number(localStorage.getItem("sensorChartPercentile") ?? "95"),
  );

  const [sensorToggleStates, setSensorToggleStates] = useState(
    JSON.parse(
      localStorage.getItem(sensorsToggledKey(readingTypeString)) ?? "[]",
    ) as string[],
  );
  const [deviceZoneToggleStates, setDeviceZoneToggleStates] = useState(
    JSON.parse(
      localStorage.getItem(sensorToggledDeviceZonesKey(readingTypeString)) ??
        "[]",
    ) as string[],
  );
  const [showReferenceLines, setShowReferenceLines] = useState(
    localStorage.getItem(`${readingTypeString}-showReferenceLines`) !== "false",
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, startTransition] = useTransition();

  return (
    <Box pos="relative">
      <Paper shadow="sm" px="md" py="xs" radius="md" withBorder>
        <Group justify="space-between" align="center">
          <Flex my={-12}>
            <h2>
              {readingTypeString.charAt(0).toUpperCase() +
                readingTypeString.slice(1)}
            </h2>
            <h5>
              {useAlternateUnits && readingTypeString == "temperature"
                ? "°F"
                : Units[readingTypeString as ReadingType]}
            </h5>
          </Flex>

          <Flex justify="right" gap="xs" align="center">
            {readingTypeString == ReadingType.temperature ? (
              <Switch
                size="md"
                offLabel={Units[readingTypeString as ReadingType]}
                onLabel="°F"
                withThumbIndicator={false}
                checked={useAlternateUnits}
                onChange={(event) => {
                  localStorage.setItem(
                    `${readingTypeString}-useAlternateUnits`,
                    event.currentTarget.checked.valueOf().toString(),
                  );
                  setAlternateUnits(!useAlternateUnits);
                }}
              />
            ) : null}
            <Button
              size="compact-xs"
              variant={"light"}
              w="110px"
              onClick={() => {
                startTransition(() => {
                  localStorage.setItem(
                    `${readingTypeString}-showReferenceLines`,
                    (!showReferenceLines).toString(),
                  );
                  setShowReferenceLines(!showReferenceLines);
                });
              }}
            >
              {showReferenceLines ? "Hide Stat Lines" : "Show Stat Lines"}
            </Button>
          </Flex>
        </Group>
        <ReadingsChartContainer
          readingType={readingTypeString}
          chartInterval={chartInterval}
          toggledSensors={sensorToggleStates}
          toggledDeviceZones={deviceZoneToggleStates}
          useAlternateUnits={useAlternateUnits}
          customTimeRange={useCustomRange ? customRange : null}
          aggregate={aggregate}
          downsampleSelection={downsample}
          percentile={percentile}
          showReferenceLines={showReferenceLines}
          onToggleReferenceLines={(value: boolean) => {
            startTransition(() => {
              localStorage.setItem(
                `${readingTypeString}-showReferenceLines`,
                value.toString(),
              );
              setShowReferenceLines(value);
            });
          }}
        />
        <ChartQueryControls
          chartInterval={segmentedControlValue}
          onChartIntervalChange={(value) => {
            startTransition(() => {
              localStorage.setItem("sensorChartInterval", value);
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
            setCustomRange(value);
          }}
          aggregate={aggregate}
          onAggregateChange={(value) => {
            startTransition(() => {
              localStorage.setItem("sensorChartAggregate", value);
              setAggregate(value);
            });
          }}
          downsample={downsample}
          onDownsampleChange={(value) => {
            startTransition(() => {
              localStorage.setItem("sensorChartDownsample", value);
              setDownsample(value);
            });
          }}
          percentile={percentile}
          onPercentileChange={(value) => {
            localStorage.setItem("sensorChartPercentile", value.toString());
            setPercentile(value);
          }}
        />
        <SensorTableAccordion
          readingType={readingTypeString as ReadingType}
          sensorToggleStates={sensorToggleStates}
          setSensorToggleStates={setSensorToggleStates}
          deviceZoneToggleStates={deviceZoneToggleStates}
          setDeviceZoneToggleStates={setDeviceZoneToggleStates}
          useAlternateUnits={useAlternateUnits}
        />
      </Paper>
    </Box>
  );
}
