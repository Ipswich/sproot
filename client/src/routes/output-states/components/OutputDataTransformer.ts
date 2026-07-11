import { DefaultColors } from "@sproot/sproot-common/src/utility/Constants";
import {
  DataPoint,
  DataSeries,
  ChartSeries,
} from "../../../requests/chartDataTypes";
import { formatDateForDisplay } from "@sproot/sproot-common/src/utility/DisplayFormats";
import type { IOutputBase } from "@sproot/outputs/IOutputBase";
import type {
  Aggregate,
  OutputDataQueryResponse,
} from "../../../requests/queryTypes";

export interface TransformedOutputData {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  units: string;
}

export const OutputDataTransformer = {
  transform(
    serverResponse: OutputDataQueryResponse | null,
    outputs: IOutputBase[],
    aggregate: Aggregate,
  ): TransformedOutputData | null {
    if (!serverResponse || !serverResponse.xAxis.values.length) {
      return null;
    }

    const outputById = new Map(outputs.map((output) => [output.id, output]));
    const responseById = new Map(
      serverResponse.data.map((entry) => [entry.id, entry]),
    );

    const chartSeries: ChartSeries[] = [];
    let colorIndex = 0;
    for (const output of outputs) {
      const responseEntry = responseById.get(output.id);
      if (!responseEntry) {
        continue;
      }

      chartSeries.push({
        name: output.name || responseEntry.name,
        color:
          output.color ??
          DefaultColors[colorIndex % DefaultColors.length] ??
          "#2e2e2e",
      });
      colorIndex++;
    }

    for (const responseEntry of serverResponse.data) {
      if (outputById.has(responseEntry.id)) {
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
        const output = outputById.get(responseEntry.id);
        const key = output?.name || responseEntry.name;
        const stats = responseEntry.statistics[aggregate];
        const rawValue = stats?.[timeIndex];
        const value = normalizeOutputValue(rawValue, aggregate);

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

function normalizeOutputValue(
  value: number | null | undefined,
  aggregate: Aggregate,
): number | null | undefined {
  if (value == null) {
    return value;
  }

  if (aggregate === "percentile" || aggregate === "stddev") {
    return Number(value.toFixed(3));
  }

  return Math.round(value);
}
