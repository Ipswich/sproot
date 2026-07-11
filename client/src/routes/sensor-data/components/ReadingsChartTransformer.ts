import { DefaultColors } from "@sproot/sproot-common/src/utility/Constants";
import {
  DataPoint,
  DataSeries,
  ChartSeries,
} from "../../../requests/chartDataTypes";
import { formatDateForDisplay } from "@sproot/sproot-common/src/utility/DisplayFormats";
import type { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import type {
  Aggregate,
  SensorDataQueryResponse,
} from "../../../requests/queryTypes";

export interface TransformedSensorData {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  units: string;
}

export const ReadingsChartTransformer = {
  transform(
    serverResponse: SensorDataQueryResponse | null,
    sensors: ISensorBase[],
    aggregate: Aggregate,
  ): TransformedSensorData | null {
    if (!serverResponse || !serverResponse.xAxis.values.length) {
      return null;
    }

    const sensorById = new Map(sensors.map((sensor) => [sensor.id, sensor]));
    const responseById = new Map(
      serverResponse.data.map((entry) => [entry.id, entry]),
    );

    const chartSeries: ChartSeries[] = [];
    let colorIndex = 0;
    for (const sensor of sensors) {
      const responseEntry = responseById.get(sensor.id);
      if (!responseEntry) {
        continue;
      }

      chartSeries.push({
        name: sensor.name || responseEntry.name,
        color:
          sensor.color ??
          DefaultColors[colorIndex % DefaultColors.length] ??
          "#2e2e2e",
      });
      colorIndex++;
    }

    for (const responseEntry of serverResponse.data) {
      if (sensorById.has(responseEntry.id)) {
        continue;
      }

      chartSeries.push({
        name: responseEntry.name,
        color: DefaultColors[colorIndex % DefaultColors.length] ?? "#2e2e2e",
      });
      colorIndex++;
    }

    const units =
      aggregate === "count" ? "" : (serverResponse.data[0]?.units ?? "");
    const timestampMap = new Map<string, DataPoint>();

    for (const [
      timeIndex,
      timeValue,
    ] of serverResponse.xAxis.values.entries()) {
      const point: DataPoint = {
        name: formatDateForDisplay(timeValue),
        units,
      };

      for (const responseEntry of serverResponse.data) {
        const sensor = sensorById.get(responseEntry.id);
        const key = sensor?.name || responseEntry.name;
        const stats = responseEntry.statistics[aggregate];
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
