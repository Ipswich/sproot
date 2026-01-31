import * as Constants from "@sproot/sproot-common/src/utility/Constants";
import {
  ChartSeries,
  ChartData,
  DataSeries,
} from "@sproot/sproot-common/src/utility/ChartData";
import {
  ReadingType,
  Units,
} from "@sproot/sproot-common/src/sensors/ReadingType";
import { Fragment, useEffect, useState } from "react";
import {
  getSensorsAsync,
  getSensorChartDataAsync,
} from "../../../requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import ReadingsChart from "./ReadingsChart";
import {
  convertCelsiusToFahrenheit,
  convertFahrenheitToCelsius,
} from "@sproot/sproot-common/src/utility/DisplayFormats";

export interface ReadingsChartContainerProps {
  readingType: string;
  chartInterval: string;
  toggledSensors: string[];
  toggledDeviceZones: string[];
  chartRendering: boolean;
  setChartRendering: (value: boolean) => void;
  useAlternateUnits: boolean;
}

export default function ReadingsChartContainer({
  readingType,
  chartInterval,
  toggledSensors,
  toggledDeviceZones,
  chartRendering,
  setChartRendering,
  useAlternateUnits,
}: ReadingsChartContainerProps) {
  const baseChartData = new ChartData(
    Constants.MAX_CHART_DATA_POINTS,
    Constants.CHART_DATA_POINT_INTERVAL,
  );
  const [timeSpans, setTimeSpans] = useState(
    ChartData.generateTimeSpansFromDataSeries(
      baseChartData.get(),
      baseChartData.intervalMinutes,
    ),
  );
  const [chartSeries, setChartSeries] = useState([] as ChartSeries[]);

  const chartDataQuery = useQuery({
    queryKey: ["sensor-data-chart"],
    queryFn: () => getSensorChartDataAsync(readingType),
    refetchInterval: 300000,
  });

  const sensorsQuery = useQuery({
    queryKey: ["sensor-data-sensors"],
    queryFn: () => getSensorsAsync(),
    refetchInterval: 60000,
  });

  const updateDataAsync = async () => {
    const newData = (await chartDataQuery.refetch()).data!;
    if (readingType == ReadingType.temperature) {
      updateUnits(newData["data"][readingType as ReadingType]);
    }
    const baseChartData = new ChartData(
      Constants.MAX_CHART_DATA_POINTS,
      Constants.CHART_DATA_POINT_INTERVAL,
      newData.data[readingType as ReadingType],
    );
    setTimeSpans(
      ChartData.generateTimeSpansFromDataSeries(
        baseChartData.get(),
        baseChartData.intervalMinutes,
      ),
    );
    setChartSeries(newData.series);
    setChartRendering(false);
  };

  const updateUnits = (dataSeries: DataSeries | undefined) => {
    if (dataSeries === undefined) {
      return;
    }
    if (readingType == ReadingType.temperature) {
      if (useAlternateUnits) {
        for (const dataPoint of dataSeries) {
          if (dataPoint.units === "°F") {
            continue;
          }
          dataPoint.units = "°F";
          for (const key of Object.keys(dataPoint)) {
            if (key === "units" || key === "name") {
              continue;
            }
            dataPoint[key] = convertCelsiusToFahrenheit(dataPoint[key])!;
          }
        }
      } else {
        for (const dataPoint of dataSeries) {
          if (dataPoint.units === Units.temperature) {
            continue;
          }
          dataPoint.units = Units.temperature;
          for (const key of Object.keys(dataPoint)) {
            if (key === "units" || key === "name") {
              continue;
            }
            dataPoint[key] = convertFahrenheitToCelsius(dataPoint[key])!;
          }
        }
      }
    }
  };

  useEffect(() => {
    updateDataAsync();

    const interval = setInterval(() => {
      updateDataAsync();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingType]);

  if (readingType == ReadingType.temperature) {
    updateUnits(timeSpans[parseInt(chartInterval)]!);
  }

  const hiddenSensorsFromDeviceZones = (
    Object.values(sensorsQuery.data ?? {}) ?? []
  )
    .filter((sensor) => {
      return (
        toggledDeviceZones.includes((sensor.deviceZoneId ?? -1).toString()) ||
        !Object.keys(sensor.lastReading).includes(readingType)
      );
    })
    .map((sensor) => sensor.name);
  const hiddenSensors =
    hiddenSensorsFromDeviceZones.length ==
    Object.values(sensorsQuery.data ?? {}).length
      ? []
      : toggledSensors.concat(hiddenSensorsFromDeviceZones);
  return (
    <Fragment>
      <ReadingsChart
        dataSeries={ChartData.filterChartData(
          timeSpans[parseInt(chartInterval)]!,
          hiddenSensors,
        )}
        chartSeries={chartSeries}
        readingType={readingType}
        chartRendering={chartDataQuery.isPending || chartRendering}
      />
    </Fragment>
  );
}
