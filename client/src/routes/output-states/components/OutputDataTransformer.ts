import { DefaultColors } from "@sproot/common/utility/Constants";
import {
  DataPoint,
  DataSeries,
  ChartSeries,
} from "../../../requests/chartDataTypes";
import { formatDateForDisplay } from "@sproot/common/utility/DisplayFormats";
import type { IOutputBase } from "@sproot/common/outputs/IOutputBase";
import type { Aggregate } from "../../../requests/queryTypes";
import type { MergedChartData } from "../../../requests/chartDataPagination";

interface ChartDataEntry {
  id: string | number;
  name?: string;
  units?: string;
  statistics?: Record<string, (number | null)[]>;
}

export interface TransformedOutputData {
  dataSeries: DataSeries;
  chartSeries: ChartSeries[];
  units: string;
}

export const OutputDataTransformer = {
  transform(
    mergedData: MergedChartData | null,
    outputs: IOutputBase[],
    aggregate: Aggregate,
  ): TransformedOutputData | null {
    if (
      !mergedData ||
      !mergedData.xAxis.values.length ||
      mergedData.data.length === 0
    ) {
      return null;
    }

    const outputById = new Map(outputs.map((output) => [output.id, output]));
    const responseById = new Map<string | number, ChartDataEntry>();
    for (const entry of mergedData.data) {
      const typedEntry = entry as ChartDataEntry;
      responseById.set(typedEntry.id, typedEntry);
    }

    const chartSeries: ChartSeries[] = [];
    let colorIndex = 0;
    for (const output of outputs) {
      const responseEntry = responseById.get(output.id);
      if (!responseEntry) {
        continue;
      }

      chartSeries.push({
        name: output.name || responseEntry.name || "",
        color:
          output.color ??
          DefaultColors[colorIndex % DefaultColors.length] ??
          "#2e2e2e",
      });
      colorIndex++;
    }

    for (const entry of mergedData.data) {
      const responseEntry = entry as ChartDataEntry;
      if (outputById.has(Number(responseEntry.id))) {
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
        const output = outputById.get(Number(responseEntry.id));
        const key = (output?.name || responseEntry.name || "") as string;
        const stats = responseEntry.statistics?.[aggregate];
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
