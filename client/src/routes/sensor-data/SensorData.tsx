import { Fragment, useState, useTransition } from "react";
import { Card, Flex, Group, Switch } from "@mantine/core";
import {
  ReadingType,
  Units,
} from "@sproot/sproot-common/src/sensors/ReadingType";
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, startTransition] = useTransition();

  return (
    <Fragment>
      <Card shadow="sm" px="md" py="xs" radius="md" withBorder>
        <Group justify="space-between">
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

          {readingTypeString == ReadingType.temperature ? (
            <Flex justify="right">
              <Switch
                mr="32px"
                size="md"
                offLabel={Units[readingTypeString as ReadingType]}
                onLabel="°F"
                checked={useAlternateUnits}
                onChange={(event) => {
                  localStorage.setItem(
                    `${readingTypeString}-useAlternateUnits`,
                    event.currentTarget.checked.valueOf().toString(),
                  );
                  setAlternateUnits(!useAlternateUnits);
                }}
              />
            </Flex>
          ) : null}
        </Group>
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
              if (!value) {
                setCustomRange(null);
              }
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
            startTransition(() => {
              localStorage.setItem("sensorChartPercentile", value.toString());
              setPercentile(value);
            });
          }}
        />

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
        />
        <SensorTableAccordion
          readingType={readingTypeString as ReadingType}
          sensorToggleStates={sensorToggleStates}
          setSensorToggleStates={setSensorToggleStates}
          deviceZoneToggleStates={deviceZoneToggleStates}
          setDeviceZoneToggleStates={setDeviceZoneToggleStates}
          useAlternateUnits={useAlternateUnits}
        />
      </Card>
    </Fragment>
  );
}
