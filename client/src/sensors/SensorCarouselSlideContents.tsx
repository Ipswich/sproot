import SensorTable from "./SensorTable";
import {
  ISensorBase,
  ReadingType,
} from "@sproot/sproot-common/src/sensors/SensorBase";
import Chart from "./Chart";
import { ChartData, Utils } from "@sproot/sproot-common/src/api/ChartData";
import { Fragment, useState, useTransition } from "react";
import { Select, Flex, Center, Card } from "@mantine/core";

interface SensorCarouselSlideProps {
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

export default function SensorCarouselSlideContents({
  readingType,
  chartData,
  sensorNames,
  sensors,
}: SensorCarouselSlideProps) {
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

  return (
    <Fragment>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Flex gap="md">
          <Center>
            <Flex>
              <h1>
                {readingType.charAt(0).toUpperCase() + readingType.slice(1)}
              </h1>
              <h5>{lookback?.chartData[0]?.units}</h5>
            </Flex>
          </Center>
          <Center>
            <Select
              data={Object.values(lookbackValues).map(
                (lookback) => lookback.label,
              )}
              defaultValue={lookback!.label}
              onChange={(value) => {
                startTransition(() => {
                  if (!value) {
                    return;
                  }
                  setCurrentLookback(value);
                  setLookback(
                    lookbackValues.find(
                      (lookback) => lookback.label == value,
                    ) ?? lookbackValues[0],
                  );
                });
              }}
            />
          </Center>
        </Flex>
        <Chart
          lookback={lookback!}
          chartSeries={sensorNames.map((sensorName, index) => ({
            name: sensorName,
            color: colors[index % colors.length]!,
          }))}
        />
        <SensorTable
          readingType={readingType as ReadingType}
          sensors={sensors}
          chartSeries={sensorNames.map((sensorName, index) => ({
            name: sensorName,
            color: colors[index % colors.length]!,
          }))}
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
