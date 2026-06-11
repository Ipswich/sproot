import {
  SENSOR_HISTORY_TABLE,
  OUTPUT_HISTORY_TABLE,
  SENSOR_AGGREGATE_TABLES,
  OUTPUT_AGGREGATE_TABLES,
  BUCKET_MINUTES_TO_SENSOR_TABLE,
  BUCKET_MINUTES_TO_OUTPUT_TABLE,
  DOWNSAMPLE_TO_BUCKET_MINUTES,
} from "@sproot/sproot-common/dist/api/v2/QueryTypes";
import {
  normalizeBucketMinutes,
  getLookbackDate,
  getRecentTailStart,
  extractPercentile,
  extractAggregateValue,
  extractRowAggregates,
  formatSensorAggregateRows,
  formatOutputAggregateRows,
} from "../databaseQueryUtils";
import { assert } from "chai";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("databaseQueryUtils constants", () => {
  it("should export correct table names", () => {
    assert.strictEqual(SENSOR_HISTORY_TABLE, "sensor_data");
    assert.strictEqual(OUTPUT_HISTORY_TABLE, "output_data");
  });

  it("should export correct aggregate table mappings", () => {
    assert.deepStrictEqual(SENSOR_AGGREGATE_TABLES, {
      "5m": "sensor_data_5m",
      "1h": "sensor_data_1h",
      "1d": "sensor_data_1d",
    });
    assert.deepStrictEqual(OUTPUT_AGGREGATE_TABLES, {
      "5m": "output_data_5m",
      "1h": "output_data_1h",
      "1d": "output_data_1d",
    });
  });

  it("should export correct bucket minutes to table mappings", () => {
    assert.deepStrictEqual(BUCKET_MINUTES_TO_SENSOR_TABLE, {
      5: "sensor_data_5m",
      60: "sensor_data_1h",
      1440: "sensor_data_1d",
    });
    assert.deepStrictEqual(BUCKET_MINUTES_TO_OUTPUT_TABLE, {
      5: "output_data_5m",
      60: "output_data_1h",
      1440: "output_data_1d",
    });
  });

  it("should export correct downsample mappings", () => {
    assert.deepStrictEqual(DOWNSAMPLE_TO_BUCKET_MINUTES, {
      "5m": 5,
      "1h": 60,
      "1d": 1440,
    });
  });
});

// ---------------------------------------------------------------------------
// normalizeBucketMinutes
// ---------------------------------------------------------------------------

describe("normalizeBucketMinutes", () => {
  it("should return the value for valid input", () => {
    assert.strictEqual(normalizeBucketMinutes(5), 5);
    assert.strictEqual(normalizeBucketMinutes(15), 15);
    assert.strictEqual(normalizeBucketMinutes(60), 60);
  });

  it("should throw for non-integer values", () => {
    assert.throws(() => normalizeBucketMinutes(5.5), Error);
  });

  it("should throw for zero", () => {
    assert.throws(() => normalizeBucketMinutes(0), Error);
  });

  it("should throw for negative values", () => {
    assert.throws(() => normalizeBucketMinutes(-5), Error);
  });
});

// ---------------------------------------------------------------------------
// getLookbackDate
// ---------------------------------------------------------------------------

describe("getLookbackDate", () => {
  it("should subtract the correct number of minutes", () => {
    const since = new Date("2024-01-15T12:00:00.000Z");
    const result = getLookbackDate(since, 30);
    const expected = new Date("2024-01-15T11:30:00.000Z");
    assert.strictEqual(result.getTime(), expected.getTime());
  });

  it("should handle 0 minutes", () => {
    const since = new Date("2024-01-15T12:00:00.000Z");
    const result = getLookbackDate(since, 0);
    assert.strictEqual(result.getTime(), since.getTime());
  });
});

// ---------------------------------------------------------------------------
// getRecentTailStart
// ---------------------------------------------------------------------------

describe("getRecentTailStart", () => {
  it("should return tailStart when it is after lookbackDate", () => {
    const since = new Date("2024-01-15T12:00:00.000Z");
    const result = getRecentTailStart(since, 60, 5);
    const expected = new Date("2024-01-15T11:55:00.000Z");
    assert.strictEqual(result.getTime(), expected.getTime());
  });

  it("should return lookbackDate when it is after tailStart", () => {
    const since = new Date("2024-01-15T12:00:00.000Z");
    const result = getRecentTailStart(since, 10, 5);
    const expected = new Date("2024-01-15T11:55:00.000Z");
    assert.strictEqual(result.getTime(), expected.getTime());
  });
});

// ---------------------------------------------------------------------------
// extractPercentile
// ---------------------------------------------------------------------------

describe("extractPercentile", () => {
  it("should extract percentile from object with 'percentile' key", () => {
    const result = extractPercentile({ percentile: 75.5 });
    assert.strictEqual(result, 75.5);
  });

  it("should extract percentile from object with 'p50' key", () => {
    const result = extractPercentile({ p50: 50 });
    assert.strictEqual(result, 50);
  });

  it("should return direct numbers", () => {
    const result = extractPercentile(75.5);
    assert.strictEqual(result, 75.5);
  });

  it("should extract from array", () => {
    const result = extractPercentile([42]);
    assert.strictEqual(result, 42);
  });

  it("should return null for null input", () => {
    assert.isNull(extractPercentile(null));
  });

  it("should return null for undefined input", () => {
    assert.isNull(extractPercentile(undefined));
  });

  it("should return null for empty array", () => {
    assert.isNull(extractPercentile([]));
  });
});

// ---------------------------------------------------------------------------
// extractAggregateValue
// ---------------------------------------------------------------------------

describe("extractAggregateValue", () => {
  it("should extract all sensor aggregate fields", () => {
    const row = {
      bucket: "2024-01-15T10:00:00.000Z",
      average_data: 22,
      minimum_data: 20,
      maximum_data: 24,
      sample_count: 3,
      stddev_data: 2,
      percentile_data: { percentile: 22 },
      first_data: 20,
      last_data: 24,
    };
    const result = extractAggregateValue(row, [
      "min",
      "max",
      "avg",
      "count",
      "sum",
      "stddev",
      "percentile",
      "first",
      "last",
    ]);
    const v = result as Record<string, number | null>;
    assert.strictEqual(v["min"], 20);
    assert.strictEqual(v["max"], 24);
    assert.strictEqual(v["avg"], 22);
    assert.strictEqual(v["count"], 3);
    assert.strictEqual(v["sum"], 66);
    assert.strictEqual(v["stddev"], 2);
    assert.strictEqual(v["percentile"], 22);
    assert.strictEqual(v["first"], 20);
    assert.strictEqual(v["last"], 24);
  });

  it("should only extract requested aggregates", () => {
    const row = {
      bucket: "2024-01-15T10:00:00.000Z",
      average_data: 22,
      minimum_data: 20,
      maximum_data: 24,
    };
    const result = extractAggregateValue(row, ["avg"]);
    const v = result as Record<string, number | null>;
    assert.strictEqual(v["avg"], 22);
    assert.isUndefined(v["min"]);
    assert.isUndefined(v["max"]);
  });

  it("should handle null values", () => {
    const row = {
      bucket: "2024-01-15T10:00:00.000Z",
      minimum_data: null,
      maximum_data: null,
      sample_count: null,
    };
    const result = extractAggregateValue(row, ["min", "max", "count"]);
    const v = result as Record<string, number | null>;
    assert.isNull(v["min"]);
    assert.isNull(v["max"]);
    assert.isNull(v["count"]);
  });
});

// ---------------------------------------------------------------------------
// extractOutputAggregateValue (inline helper — tests extractRowAggregates with "_value" suffix)
// ---------------------------------------------------------------------------

describe("extractOutputAggregateValue (via extractRowAggregates)", () => {
  it("should extract all output aggregate fields", () => {
    const row = {
      bucket: "2024-01-15T10:00:00.000Z",
      average_value: 0.5,
      minimum_value: 0,
      maximum_value: 1,
      sample_count: 10,
      stddev_value: 0.3,
      percentile_value: { percentile: 0.8 },
    };
    const result = extractRowAggregates(
      row,
      ["min", "max", "avg", "count", "sum", "stddev", "percentile", "first", "last"],
      "_value",
    );
    const v = result as Record<string, number | null>;
    assert.strictEqual(v["min"], 0);
    assert.strictEqual(v["max"], 1);
    assert.strictEqual(v["avg"], 0.5);
    assert.strictEqual(v["count"], 10);
    assert.strictEqual(v["sum"], 5);
    assert.strictEqual(v["stddev"], 0.3);
    assert.strictEqual(v["percentile"], 0.8);
    assert.isNull(v["first"]);
    assert.isNull(v["last"]);
  });

  it("should extract first_value and last_value when present", () => {
    const row = {
      bucket: "2024-01-15T10:00:00.000Z",
      average_value: 0.5,
      minimum_value: 0,
      maximum_value: 1,
      sample_count: 10,
      stddev_value: 0.3,
      percentile_value: { percentile: 0.8 },
      first_value: 0.1,
      last_value: 0.9,
    };
    const result = extractRowAggregates(row, ["first", "last"], "_value");
    const v = result as Record<string, number | null>;
    assert.strictEqual(v["first"], 0.1);
    assert.strictEqual(v["last"], 0.9);
  });
});

// ---------------------------------------------------------------------------
// formatSensorAggregateRows
// ---------------------------------------------------------------------------

describe("formatSensorAggregateRows", () => {
  it("should format sensor aggregate rows into response structure", () => {
    const rows = [
      {
        sensor_id: 1,
        metric: "temperature",
        units: "°C",
        average_data: 22,
        minimum_data: 20,
        maximum_data: 24,
        sample_count: 3,
      },
      {
        sensor_id: 1,
        metric: "humidity",
        units: "%",
        average_data: 60,
        minimum_data: 55,
        maximum_data: 65,
        sample_count: 3,
      },
      {
        sensor_id: 2,
        metric: "temperature",
        units: "°C",
        average_data: 25,
        minimum_data: 23,
        maximum_data: 27,
        sample_count: 3,
      },
    ];
    const result = formatSensorAggregateRows(rows, ["min", "max", "avg"]);
    assert.notProperty(result, "nextCursor");
    assert.strictEqual(Object.keys(result.data).length, 2);
    const s1 = result.data[1]!;
    const temp1 = s1["temperature"]!;
    assert.strictEqual(temp1.units, "°C");
    assert.strictEqual(s1["humidity"]!.units, "%");
    assert.strictEqual(temp1.values.length, 1);
    assert.strictEqual(temp1.values[0]!["min"], 20);
  });
});

// ---------------------------------------------------------------------------
// formatOutputAggregateRows
// ---------------------------------------------------------------------------

describe("formatOutputAggregateRows", () => {
  it("should format output aggregate rows into response structure", () => {
    const rows = [
      { output_id: 1, average_value: 0.5, minimum_value: 0, maximum_value: 1, sample_count: 10 },
      { output_id: 2, average_value: 1, minimum_value: 1, maximum_value: 1, sample_count: 5 },
    ];
    const result = formatOutputAggregateRows(rows, ["min", "max", "avg"], "some-cursor");
    assert.strictEqual(result.nextCursor, "some-cursor");
    assert.strictEqual(Object.keys(result.data).length, 2);
    assert.strictEqual(result.data[1]!.values.length, 1);
    assert.strictEqual(result.data[1]!.values[0]!["min"], 0);
    assert.strictEqual(result.data[2]!.values[0]!["max"], 1);
  });
});
