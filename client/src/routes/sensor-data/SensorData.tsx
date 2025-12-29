import {
  Fragment,
  SetStateAction,
  useEffect,
  useState,
  useTransition,
} from "react";
import { Card, Flex, Group, SegmentedControl, Switch } from "@mantine/core";
import {
  ReadingType,
  Units,
} from "@sproot/sproot-common/src/sensors/ReadingType";
import { useLoaderData } from "react-router-dom";
import ReadingsChartContainer from "./components/ReadingsChartContainer";
import SensorTableAccordion from "./components/SensorTableAccordion";
import {
  sensorsToggledKey,
  sensorToggledDeviceGroupsKey,
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
  const [chartRendering, setChartRendering] = useState(true);

  const [sensorToggleStates, setSensorToggleStates] = useState(
    JSON.parse(
      localStorage.getItem(sensorsToggledKey(readingTypeString)) ?? "[]",
    ) as string[],
  );
  const [deviceGroupToggleStates, setDeviceGroupToggleStates] = useState(
    JSON.parse(
      localStorage.getItem(sensorToggledDeviceGroupsKey(readingTypeString)) ??
        "[]",
    ) as string[],
  );

  useEffect(() => {
    setChartRendering(false);
  }, [chartInterval, readingTypeString]);

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
        <ReadingsChartContainer
          readingType={readingTypeString}
          chartInterval={chartInterval}
          toggledSensors={sensorToggleStates}
          toggledDeviceGroups={deviceGroupToggleStates}
          chartRendering={chartRendering}
          setChartRendering={setChartRendering}
          useAlternateUnits={useAlternateUnits}
        />
        <div style={{ height: "40px", marginTop: "8px" }}>
          <SegmentedControl
            defaultValue={segmentedControlValue}
            value={segmentedControlValue}
            onChange={(value) => {
              localStorage.setItem("sensorChartInterval", value);
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
          ></SegmentedControl>
        </div>
        <SensorTableAccordion
          readingType={readingTypeString as ReadingType}
          sensorToggleStates={sensorToggleStates}
          setSensorToggleStates={(
            newSensorToggleState: SetStateAction<string[]>,
          ) => {
            setSensorToggleStates(newSensorToggleState);
          }}
          deviceGroupToggleStates={deviceGroupToggleStates}
          setDeviceGroupToggleStates={setDeviceGroupToggleStates}
          useAlternateUnits={useAlternateUnits}
        />
      </Card>
    </Fragment>
  );
}
