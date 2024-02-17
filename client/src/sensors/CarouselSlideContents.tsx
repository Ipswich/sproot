import SensorTable from "./SensorTable";
import {
  ISensorBase,
  ReadingType,
} from "@sproot/sproot-common/src/sensors/SensorBase";
import Chart from "./Chart";
import { ChartData, Utils } from "@sproot/sproot-common/src/api/ChartData";
import { Fragment, useState, useTransition } from "react";
import { Select, Flex, Center, Card } from "@mantine/core";

interface CarouselSlideProps {
  lastUpdated: Date;
  readingType: ReadingType;
  chartData: ChartData[];
  sensorNames: string[];
  sensors: Record<string, ISensorBase>;
}

const colors = [
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "grape",
  "pink",
  "red",
  "orange",
  "yellow",
];

export default function CarouselSlideContents({
  lastUpdated,
  readingType,
  chartData,
  sensorNames,
  sensors,
}: CarouselSlideProps) {
  const [chartRendering, setChartRendering] = useState(true);
  const [toggleState, setToggleState] = useState([] as string[]);
  const [chartSubData, setChartSubData] = useState(
    Utils.generateChartDataSubsection(chartData, []),
  );
  const [currentLookBack, setCurrentLookback] = useState("24 Hours");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, startTransition] = useTransition();

  const lookbackValues = Object.values(chartSubData.lookbacks);
  const [lookback, setLookback] = useState(
    lookbackValues.find((lookback) => lookback.label == currentLookBack) ??
      lookbackValues[0],
  );

  const currentTimeStamp = `${lastUpdated.toLocaleDateString([], { day: "2-digit", month: "numeric" })} ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const chartSeries = sensorNames.map((sensorName, index) => ({
    name: sensorName,
    color: colors[index % colors.length]!,
  }));

  return (
    <Fragment>
      <Card shadow="sm" px="md" py="xs" radius="md" withBorder>
        <Flex gap="md">
          <Center>
            <Flex>
              <h2>
                {readingType.charAt(0).toUpperCase() + readingType.slice(1)}
              </h2>
              <h5>{lookback?.chartData[0]?.units}</h5>
            </Flex>
          </Center>
          <Center>
            <Select
              data={Object.values(lookbackValues).map(
                (lookback) => lookback.label,
              )}
              allowDeselect={false}
              defaultValue={lookback!.label}
              onChange={(value) => {
                if (!value || value == currentLookBack) {
                  return;
                }
                setChartRendering(true);
                startTransition(() => {
                  setCurrentLookback(value);
                  setLookback(
                    lookbackValues.find(
                      (lookback) => lookback.label == value,
                    ) ?? lookbackValues[0],
                  );
                  setChartRendering(false);
                });
              }}
            />
          </Center>
        </Flex>
        <Chart
          chartRendering={chartRendering}
          setChartRendering={setChartRendering}
          lookback={lookback!}
          chartSeries={chartSeries}
        />
        <Center>
          <h5>Last Updated: {currentTimeStamp}</h5>
        </Center>
        <SensorTable
          readingType={readingType as ReadingType}
          sensors={sensors}
          chartSeries={chartSeries}
          toggleState={toggleState}
          setToggleState={(newToggleState) => {
            setToggleState(newToggleState);
            const newChartSubData = Utils.generateChartDataSubsection(
              chartData,
              newToggleState,
            );
            setChartSubData(newChartSubData);
            setLookback(
              Object.values(newChartSubData.lookbacks).find(
                (lookback) => lookback.label == currentLookBack,
              ) ?? lookbackValues[0],
            );
          }}
        />
      </Card>
    </Fragment>
  );
}
