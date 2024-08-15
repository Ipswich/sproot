import {
  Fragment,
  SetStateAction,
  useEffect,
  useState,
  useTransition,
} from "react";
import { Card, SegmentedControl } from "@mantine/core";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { useLoaderData } from "react-router-dom";
import ReadingsChartContainer from "./components/ReadingsChartContainer";
import SensorTable from "./components/SensorTable";

export default function SensorData() {
  const readingTypeString = useLoaderData() as string;

  const [chartInterval, setChartInterval] = useState("24");
  const [segmentedControlValue, setSegmentedControlValue] =
    useState(chartInterval);
  const [chartRendering, setChartRendering] = useState(true);

  const [sensorToggleStates, setSensorToggleStates] = useState([] as string[]);

  useEffect(() => {
    setChartRendering(false);
  }, [chartInterval, readingTypeString]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, startTransition] = useTransition();

  return (
    <Fragment>
      <Card shadow="sm" px="md" py="xs" radius="md" withBorder>
        <ReadingsChartContainer
          readingType={readingTypeString}
          chartInterval={chartInterval}
          toggledSensors={sensorToggleStates}
          chartRendering={chartRendering}
          setChartRendering={setChartRendering}
        />
        <div style={{ height: "40px", marginTop: "8px" }}>
          <SegmentedControl
            defaultValue={segmentedControlValue}
            value={segmentedControlValue}
            onChange={(value) => {
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
        <SensorTable
          readingType={readingTypeString as ReadingType}
          toggleStates={sensorToggleStates}
          setToggleState={(newToggleState: SetStateAction<string[]>) => {
            setSensorToggleStates(newToggleState);
          }}
        />
      </Card>
    </Fragment>
  );
}
