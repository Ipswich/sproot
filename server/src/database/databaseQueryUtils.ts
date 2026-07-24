import { dbToIso } from "../utils/dateUtils";
import {
  SensorDataQueryResponse,
  OutputDataQueryResponse,
  Aggregate,
} from "@sproot/common/dist/api/v2/QueryTypes";

// ---------------------------------------------------------------------------
// Bucket / time helpers
// ---------------------------------------------------------------------------

export function normalizeBucketMinutes(bucketMinutes: number): number {
  if (!Number.isInteger(bucketMinutes) || bucketMinutes <= 0) {
    throw new Error(`Invalid bucketMinutes value: ${bucketMinutes}`);
  }
  return bucketMinutes;
}

export function getLookbackDate(since: Date, minutes: number): Date {
  const lookbackDate = new Date(since.getTime() - minutes * 60_000);
  return lookbackDate;
}

export function getRecentTailStart(since: Date, minutes: number, bucketMinutes: number): Date {
  const lookbackDate = getLookbackDate(since, minutes);
  const tailStart = new Date(since.getTime() - bucketMinutes * 60_000);
  const effectiveStart = tailStart > lookbackDate ? tailStart : lookbackDate;
  return effectiveStart;
}

// ---------------------------------------------------------------------------
// Aggregate extraction helpers
// ---------------------------------------------------------------------------

export function extractPercentile(percentileData: unknown): number | null {
  if (percentileData == null) return null;
  if (typeof percentileData === "number")
    return Number.isNaN(percentileData) ? null : percentileData;
  if (typeof percentileData === "object" && !Array.isArray(percentileData)) {
    const obj = percentileData as Record<string, unknown>;
    if ("percentile" in obj) {
      const n = Number(obj["percentile"]);
      return Number.isNaN(n) ? null : n;
    }
    if ("p50" in obj) {
      const n = Number(obj["p50"]);
      return Number.isNaN(n) ? null : n;
    }
  }
  if (Array.isArray(percentileData) && percentileData.length > 0) {
    const n = Number(percentileData[0]);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function safeNumber(val: unknown): number | null {
  if (val == null) return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
}

export function extractRowAggregates(
  row: Record<string, unknown>,
  requestedAggregates: Aggregate[],
  columnSuffix: "_data" | "_value" = "_data",
): Record<string, unknown> {
  const bucket = row["bucket"];
  if (bucket == null) {
    throw new Error("Row missing required 'bucket' column");
  }
  const bucketValue =
    typeof bucket === "string" || bucket instanceof Date ? bucket : String(bucket);
  const value: Record<string, unknown> = {
    time: dbToIso(bucketValue) ?? String(bucketValue),
  };

  const rawAvg = row[`average${columnSuffix}`];
  const rawMin = row[`minimum${columnSuffix}`];
  const rawMax = row[`maximum${columnSuffix}`];
  const rawCount = row["sample_count"];
  const rawStddev = row[`stddev${columnSuffix}`];
  const rawPercentile = row[`percentile${columnSuffix}`];
  const rawFirst = row[`first${columnSuffix}`];
  const rawLast = row[`last${columnSuffix}`];

  for (const agg of requestedAggregates) {
    switch (agg) {
      case "min":
        value["min"] = safeNumber(rawMin);
        break;
      case "max":
        value["max"] = safeNumber(rawMax);
        break;
      case "avg":
        value["avg"] = safeNumber(rawAvg);
        break;
      case "count":
        value["count"] = safeNumber(rawCount);
        break;
      case "sum": {
        const avg = safeNumber(rawAvg);
        const count = safeNumber(rawCount);
        value["sum"] = avg != null && count != null ? avg * count : null;
        break;
      }
      case "stddev":
        value["stddev"] = safeNumber(rawStddev);
        break;
      case "percentile":
        value["percentile"] = extractPercentile(rawPercentile);
        break;
      case "first":
        value["first"] = safeNumber(rawFirst);
        break;
      case "last":
        value["last"] = safeNumber(rawLast);
        break;
    }
  }

  return value;
}

// ---------------------------------------------------------------------------
// Column-based format functions (server-side pivot)
// ---------------------------------------------------------------------------

export function formatSensorDataQueryRows(
  rows: Array<Record<string, unknown>>,
  aggregates: Aggregate[],
  nextCursor?: string,
): SensorDataQueryResponse {
  const response: SensorDataQueryResponse = { xAxis: { field: "time", values: [] }, data: null };
  if (nextCursor) response.nextCursor = nextCursor;

  if (rows.length === 0) return response;

  // Collect all unique timestamps (descending)
  const timestampSet = new Set<string>();
  for (const row of rows) {
    const bucket = row["bucket"];
    if (bucket != null) {
      const bucketValue =
        typeof bucket === "string" || bucket instanceof Date ? bucket : String(bucket);
      timestampSet.add(dbToIso(bucketValue) ?? String(bucketValue));
    }
  }
  response.xAxis.values = Array.from(timestampSet).sort(
    (a: string, b: string) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // Group by sensor_id + metric
  const sensorMetricMap = new Map<
    string,
    {
      id: number;
      name: string;
      units: string;
      values: Map<string, Record<string, unknown>>;
    }
  >();

  for (const row of rows) {
    const sensorId = row["sensor_id"] as number;
    const metric = row["metric"] as string;
    const key = `${sensorId}:${metric}`;
    const name = metric;
    const units = row["units"] as string;
    const bucket = row["bucket"];
    const bucketValue =
      typeof bucket === "string" || bucket instanceof Date ? bucket : String(bucket);
    const timeStr = dbToIso(bucketValue) ?? String(bucketValue);

    if (!sensorMetricMap.has(key)) {
      sensorMetricMap.set(key, { id: sensorId, name, units, values: new Map() });
    }
    const entry = sensorMetricMap.get(key)!;
    const agg = extractRowAggregates(row, aggregates, "_data");
    entry.values.set(timeStr, agg as Record<string, unknown>);
  }

  // Build data (single entry for single-ID query)
  for (const [, entry] of sensorMetricMap) {
    const statistics: Record<string, (number | null)[]> = {};
    for (const agg of aggregates) {
      statistics[agg] = response.xAxis.values.map((ts: string) => {
        const value = entry.values.get(ts);
        return value ? (value[agg] as number | null) : null;
      });
    }
    response.data = {
      id: entry.id,
      name: entry.name,
      units: entry.units,
      statistics,
    };
    break;
  }

  return response;
}

export function formatOutputDataQueryRows(
  rows: Array<Record<string, unknown>>,
  aggregates: Aggregate[],
  nextCursor?: string,
): OutputDataQueryResponse {
  const response: OutputDataQueryResponse = { xAxis: { field: "time", values: [] }, data: null };
  if (nextCursor) response.nextCursor = nextCursor;

  if (rows.length === 0) return response;

  // Collect all unique timestamps (descending)
  const timestampSet = new Set<string>();
  for (const row of rows) {
    const bucket = row["bucket"];
    if (bucket != null) {
      const bucketValue =
        typeof bucket === "string" || bucket instanceof Date ? bucket : String(bucket);
      timestampSet.add(dbToIso(bucketValue) ?? String(bucketValue));
    }
  }
  response.xAxis.values = Array.from(timestampSet).sort(
    (a: string, b: string) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // Group by output_id
  const outputMap = new Map<
    number,
    {
      id: number;
      name: string;
      units: string;
      values: Map<string, Record<string, unknown>>;
    }
  >();

  for (const row of rows) {
    const outputId = row["output_id"] as number;
    const name = row["output_name"] as string;
    const units = row["output_units"] as string;
    const bucket = row["bucket"];
    const bucketValue =
      typeof bucket === "string" || bucket instanceof Date ? bucket : String(bucket);
    const timeStr = dbToIso(bucketValue) ?? String(bucketValue);

    if (!outputMap.has(outputId)) {
      outputMap.set(outputId, { id: outputId, name, units, values: new Map() });
    }
    const entry = outputMap.get(outputId)!;
    const agg = extractRowAggregates(row, aggregates, "_value");
    entry.values.set(timeStr, agg as Record<string, unknown>);
  }

  // Build data (single entry for single-ID query)
  for (const [, entry] of outputMap) {
    const statistics: Record<string, (number | null)[]> = {};
    for (const agg of aggregates) {
      statistics[agg] = response.xAxis.values.map((ts: string) => {
        const value = entry.values.get(ts);
        return value ? (value[agg] as number | null) : null;
      });
    }
    response.data = {
      id: entry.id,
      name: entry.name,
      units: entry.units,
      statistics,
    };
    break;
  }

  return response;
}
