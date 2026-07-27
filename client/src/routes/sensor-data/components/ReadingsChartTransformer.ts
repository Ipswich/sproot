import { DefaultColors } from "@sproot/common/utility/Constants";
import {
  DataPoint,
  DataSeries,
  ChartSeries,
} from "../../../requests/chartDataTypes";
import { formatDateForDisplay } from "@sproot/common/utility/DisplayFormats";
import type { ISensorBase } from "@sproot/common/sensors/ISensorBase";
import type { Aggregate } from "../../../requests/queryTypes";
import type { MergedChartData } from "../../../requests/chartDataPagination";

interface ChartDataEntry {
  id: string | number;
  name?: string;
  units?: string;
  statistics?: Record<string, (number | null)[]>;
}

export interface TransformedSensorData {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  units: string;
}

export const ReadingsChartTransformer = {
  transform(
    mergedData: MergedChartData | null,
    sensors: ISensorBase[],
    aggregate: Aggregate,
  ): TransformedSensorData | null {
    if (
      !mergedData ||
      !mergedData.xAxis.values.length ||
      mergedData.data.length === 0
    ) {
      return null;
    }

    const sensorById = new Map(sensors.map((sensor) => [sensor.id, sensor]));
    const responseById = new Map<string | number, ChartDataEntry>();
    for (const entry of mergedData.data) {
      const typedEntry = entry as ChartDataEntry;
      responseById.set(typedEntry.id, typedEntry);
    }

    const chartSeries: ChartSeries[] = [];
    let colorIndex = 0;
    for (const sensor of sensors) {
      const responseEntry = responseById.get(sensor.id);
      if (!responseEntry) {
        continue;
      }

      chartSeries.push({
        name: sensor.name || responseEntry.name || "",
        color:
          sensor.color ??
          DefaultColors[colorIndex % DefaultColors.length] ??
          "#2e2e2e",
      });
      colorIndex++;
    }

    for (const entry of mergedData.data) {
      const responseEntry = entry as ChartDataEntry;
      if (sensorById.has(Number(responseEntry.id))) {
        continue;
      }

      chartSeries.push({
        name: responseEntry.name || "",
        color: DefaultColors[colorIndex % DefaultColors.length] ?? "#2e2e2e",
      });
      colorIndex++;
    }

    const units =
      aggregate === "count"
        ? ""
        : ((mergedData.data[0] as ChartDataEntry)?.units ?? "");
    const timestampMap = new Map<string, DataPoint>();

    for (const [timeIndex, timeValue] of mergedData.xAxis.values.entries()) {
      const point: DataPoint = {
        name: formatDateForDisplay(timeValue),
        rawTimestamp: timeValue,
        units,
      };

      for (const entry of mergedData.data) {
        const responseEntry = entry as ChartDataEntry;
        const sensor = sensorById.get(Number(responseEntry.id));
        const key = (sensor?.name || responseEntry.name || "") as string;
        const stats = responseEntry.statistics?.[aggregate];
        const value = stats?.[timeIndex];

        if (value != null) {
          point[key] = value;
        }
      }

      const hasValue = Object.keys(point).some(
        (key) => key !== "name" && key !== "units" && point[key] !== undefined,
      );
      if (hasValue) {
        timestampMap.set(timeValue, point);
      }
    }

    const dataSeries = Array.from(timestampMap.entries())
      .sort(
        ([timeA], [timeB]) =>
          new Date(timeA).getTime() - new Date(timeB).getTime(),
      )
      .map(([, point]) => point);

    return {
      dataSeries,
      chartSeries,
      units,
    };
  },
};
