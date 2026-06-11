import { dbToIso } from "../utils/dateUtils";
import {
  SensorDataQueryResponse,
  OutputDataQueryResponse,
  Aggregate,
  SensorDataValue,
  OutputDataValue,
  Downsample,
  DOWNSAMPLE_TO_BUCKET_MINUTES,
} from "@sproot/sproot-common/dist/api/v2/QueryTypes";

// ---------------------------------------------------------------------------
// Bucket / time helpers
// ---------------------------------------------------------------------------

export function normalizeBucketMinutes(bucketMinutes: number): number {
  if (!Number.isInteger(bucketMinutes) || bucketMinutes <= 0) {
    throw new Error(`Invalid bucketMinutes value: ${bucketMinutes}`);
  }
  return bucketMinutes;
}

export function resolveBucketMinutes(downsample: Downsample | undefined): number {
  return DOWNSAMPLE_TO_BUCKET_MINUTES[downsample ?? "5m"];
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

export function extractAggregateValue(
  row: Record<string, unknown>,
  requestedAggregates: Aggregate[],
): Record<string, unknown> {
  return extractRowAggregates(row, requestedAggregates, "_data");
}

export function extractRowAggregates(
  row: Record<string, unknown>,
  requestedAggregates: Aggregate[],
  columnSuffix: "_data" | "_value" = "_data",
): Record<string, unknown> {
  const bucket = row["bucket"] as string | Date;
  const value: Record<string, unknown> = {
    time: dbToIso(bucket) ?? String(bucket),
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
        value["min"] = rawMin != null ? Number(rawMin) : null;
        break;
      case "max":
        value["max"] = rawMax != null ? Number(rawMax) : null;
        break;
      case "avg":
        value["avg"] = rawAvg != null ? Number(rawAvg) : null;
        break;
      case "count":
        value["count"] = rawCount != null ? Number(rawCount) : null;
        break;
      case "sum":
        value["sum"] =
          rawAvg != null && rawCount != null ? Number(rawAvg) * Number(rawCount) : null;
        break;
      case "stddev":
        value["stddev"] = rawStddev != null ? Number(rawStddev) : null;
        break;
      case "percentile":
        value["percentile"] = extractPercentile(rawPercentile);
        break;
      case "first":
        value["first"] = rawFirst != null ? Number(rawFirst) : null;
        break;
      case "last":
        value["last"] = rawLast != null ? Number(rawLast) : null;
        break;
    }
  }

  return value;
}

export function formatSensorAggregateRows(
  rows: Array<Record<string, unknown>>,
  aggregates: Aggregate[],
  nextCursor?: string,
): SensorDataQueryResponse {
  const response: SensorDataQueryResponse = { data: {} };
  if (nextCursor) {
    response.nextCursor = nextCursor;
  }

  for (const row of rows) {
    const sensorId = row["sensor_id"] as number;
    const metric = row["metric"] as string;
    const units = row["units"] as string;

    if (!response.data[sensorId]) {
      response.data[sensorId] = {};
    }
    if (!response.data[sensorId][metric]) {
      response.data[sensorId][metric] = { units, values: [] };
    }

    const value = extractAggregateValue(row, aggregates);
    response.data[sensorId][metric].values.push(value as SensorDataValue);
  }

  return response;
}

export function formatOutputAggregateRows(
  rows: Array<Record<string, unknown>>,
  aggregates: Aggregate[],
  nextCursor?: string,
): OutputDataQueryResponse {
  const response: OutputDataQueryResponse = { data: {} };
  if (nextCursor) {
    response.nextCursor = nextCursor;
  }

  for (const row of rows) {
    const outputId = row["output_id"] as number;

    if (!response.data[outputId]) {
      response.data[outputId] = { values: [] };
    }

    const value = extractRowAggregates(row, aggregates, "_value");
    response.data[outputId].values.push(value as OutputDataValue);
  }

  return response;
}
