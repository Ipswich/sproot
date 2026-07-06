import type { Knex } from "knex";

// ---------------------------------------------------------------------------
// Interval parsing — extracts bucket size in minutes from PostgreSQL INTERVAL strings
// ---------------------------------------------------------------------------

export function parseIntervalToMinutes(interval: string): number {
  const trimmed = interval.trim().toLowerCase();

  // Handle "Xm" shorthand (e.g., "1m", "15m", "30m")
  const shorthandMatch = trimmed.match(/^(\d+)m$/);
  if (shorthandMatch) {
    return parseInt(shorthandMatch[1]!, 10);
  }

  // Handle "Xh" shorthand (e.g., "1h", "4h")
  const hourShorthandMatch = trimmed.match(/^(\d+)h$/);
  if (hourShorthandMatch) {
    return parseInt(hourShorthandMatch[1]!, 10) * 60;
  }

  // Handle "Xd" shorthand (e.g., "1d")
  const dayShorthandMatch = trimmed.match(/^(\d+)d$/);
  if (dayShorthandMatch) {
    return parseInt(dayShorthandMatch[1]!, 10) * 1440;
  }

  // Handle full INTERVAL syntax (e.g., "15 minutes", "1 hour", "4 hours", "1 day")
  const intervalMatch = trimmed.match(
    /^(\d+)\s*(minute|minutes|min|hour|hours|hr|hrs|day|days|d)$/,
  );
  if (intervalMatch) {
    const value = parseInt(intervalMatch[1]!, 10);
    const unit = intervalMatch[2]!;
    if (unit.startsWith("hour") || unit.startsWith("hr")) {
      return value * 60;
    }
    if (unit.startsWith("day")) {
      return value * 1440;
    }
    return value; // minutes
  }

  // Fallback: try to extract any number and assume minutes
  const numberMatch = trimmed.match(/^(\d+)$/);
  if (numberMatch) {
    return parseInt(numberMatch[1]!, 10);
  }

  throw new Error(
    `Unable to parse interval: "${interval}". Expected format like '15 minutes', '1h', or '15m'.`,
  );
}

// ---------------------------------------------------------------------------
// Sensor raw query builder
// ---------------------------------------------------------------------------

export function buildSensorRawQuery(
  knex: Knex,
  interval: string,
  whereRaw: Knex.Raw,
  limit: number,
) {
  const bucketExpr = knex.raw('time_bucket(INTERVAL ?, "logTime") AS bucket', [interval]);

  return knex("sensor_data")
    .select(
      bucketExpr,
      "sensor_id",
      "metric",
      "units",
      knex.raw("COUNT(*) AS sample_count"),
      knex.raw("AVG(data)::numeric(12, 7) AS average_data"),
      knex.raw("MIN(data) AS minimum_data"),
      knex.raw("MAX(data) AS maximum_data"),
      knex.raw("STDDEV_SAMP(data) AS stddev_data"),
      knex.raw("approx_percentile(0.5, percentile_agg(data)) AS percentile_data"),
      knex.raw(
        "first(data, \"logTime\" ORDER BY \"logTime\" ASC) AS first_data",
      ),
      knex.raw(
        "first(units, \"logTime\" ORDER BY \"logTime\" ASC) AS units",
      ),
      knex.raw(
        "last(data, \"logTime\" ORDER BY \"logTime\" DESC) AS last_data",
      ),
    )
    .where(whereRaw)
    .groupByRaw('"sensor_id", "metric", "bucket"')
    .orderBy("bucket", "DESC")
    .limit(limit + 1);
}

// ---------------------------------------------------------------------------
// Output raw query builder
// ---------------------------------------------------------------------------

export function buildOutputRawQuery(
  knex: Knex,
  interval: string,
  whereRaw: Knex.Raw,
  limit: number,
) {
  const bucketExpr = knex.raw('time_bucket(INTERVAL ?, "logTime") AS bucket', [interval]);

  return knex("output_data")
    .select(
      bucketExpr,
      "output_id",
      knex.raw("COUNT(*) AS sample_count"),
      knex.raw("AVG(value)::numeric(12, 7) AS average_value"),
      knex.raw("MIN(value) AS minimum_value"),
      knex.raw("MAX(value) AS maximum_value"),
      knex.raw("STDDEV_SAMP(value) AS stddev_value"),
      knex.raw("approx_percentile(0.5, percentile_agg(value)) AS percentile_value"),
      knex.raw(
        "first(value, \"logTime\" ORDER BY \"logTime\" ASC) AS first_value",
      ),
      knex.raw(
        "last(value, \"logTime\" ORDER BY \"logTime\" DESC) AS last_value",
      ),
    )
    .where(whereRaw)
    .groupByRaw('"output_id", "bucket"')
    .orderBy("bucket", "DESC")
    .limit(limit + 1);
}
