import {
  validateSensorDataQueryRequest,
  validateOutputDataQueryRequest,
  DEFAULT_AGGREGATES,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_ARRAY_SIZE,
} from "../QueryTypes";
import { assert } from "chai";

describe("QueryTypes validation — sensor data", () => {
  it("should validate a complete valid request", () => {
    const body = {
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      downsample: "5m",
      cursor: Buffer.from("2024-01-01T12:00:00.000Z").toString("base64"),
      limit: 100,
      ids: [1, 2, 3],
      readingTypes: ["temperature", "humidity"],
      aggregates: ["avg", "min", "max"],
      percentile: 0.95,
    };
    const result = validateSensorDataQueryRequest(body);
    assert.isTrue(result.valid);
    if (result.valid) {
      const d = result.data as Record<string, unknown>;
      assert.deepStrictEqual(d["ids"], [1, 2, 3]);
      assert.strictEqual(d["percentile"], 0.95);
    }
  });

  it("should reject missing timeRange", () => {
    const result = validateSensorDataQueryRequest({});
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "timeRange is required");
    }
  });

  it("should reject invalid timeRange dates", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "not-a-date", end: "2024-01-02T00:00:00.000Z" },
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "not a valid ISO 8601 date");
    }
  });

  it("should reject end before start", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-02T00:00:00.000Z", end: "2024-01-01T00:00:00.000Z" },
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "timeRange.end must be after timeRange.start");
    }
  });

  it("should reject equal start and end dates", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T00:00:00.000Z" },
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "timeRange.end must be after timeRange.start");
    }
  });

  it("should accept any non-empty downsample string", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      downsample: "30m",
    });
    assert.isTrue(result.valid);
  });

  it("should reject empty or whitespace-only downsample", () => {
    const resultEmpty = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      downsample: "",
    });
    assert.isFalse(resultEmpty.valid);
    if (!resultEmpty.valid) {
      assert.include(resultEmpty.errors[0], "downsample must not be empty");
    }
    const resultWhitespace = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      downsample: "   ",
    });
    assert.isFalse(resultWhitespace.valid);
    if (!resultWhitespace.valid) {
      assert.include(resultWhitespace.errors[0], "downsample must not be empty");
    }
  });

  it("should reject invalid cursor (non-base64)", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      cursor: "!!!not-base64!!!",
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "invalid timestamp");
    }
  });

  it("should reject invalid cursor (valid base64 but invalid date)", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      cursor: Buffer.from("not-a-date").toString("base64"),
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "invalid timestamp");
    }
  });

  it("should reject cursor with empty string", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      cursor: "",
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "invalid timestamp");
    }
  });

  it("should reject limit exceeding MAX_LIMIT", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      limit: MAX_LIMIT + 1,
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], `must not exceed ${MAX_LIMIT}`);
    }
  });

  it("should reject non-integer limit", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      limit: 3.5,
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "integer");
    }
  });

  it("should reject non-array ids", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      ids: "not-an-array",
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "ids must be an array");
    }
  });

  it("should reject ids array with non-number elements", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      ids: [1, "two", 3],
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "contain only numbers");
    }
  });

  it("should reject ids array with NaN elements", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      ids: [1, NaN, 3],
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "contain only numbers");
    }
  });

  it("should reject ids array with Infinity elements", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      ids: [1, Infinity, 3],
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "contain only numbers");
    }
  });

  it("should reject invalid aggregates", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      aggregates: ["avg", "invalid_agg"],
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "valid aggregate names");
    }
  });

  it("should reject percentile outside 0-1 range", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      percentile: 1.5,
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "between 0 and 1");
    }
  });

  it("should reject NaN percentile", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      percentile: NaN,
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "must be a number");
    }
  });

  it("should accept percentile boundary values 0 and 1", () => {
    const result0 = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      percentile: 0,
    });
    assert.isTrue(result0.valid);
    const result1 = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      percentile: 1,
    });
    assert.isTrue(result1.valid);
  });

  it("should reject negative percentile", () => {
    const result = validateSensorDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      percentile: -0.1,
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "between 0 and 1");
    }
  });

  it("should use defaults when optional fields omitted", () => {
    const body = {
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
    };
    const result = validateSensorDataQueryRequest(body);
    assert.isTrue(result.valid);
    if (result.valid) {
      const d = result.data as Record<string, unknown>;
      assert.strictEqual(d["limit"], DEFAULT_LIMIT);
      assert.deepStrictEqual(d["aggregates"], DEFAULT_AGGREGATES);
      assert.strictEqual(d["percentile"], 0.5);
    }
  });

  it("should reject non-object body", () => {
    const result = validateSensorDataQueryRequest("not-an-object");
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "must be an object");
    }
  });
});

describe("QueryTypes validation — output data", () => {
  it("should validate a complete valid request", () => {
    const body = {
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      downsample: "1h",
      cursor: Buffer.from("2024-01-01T12:00:00.000Z").toString("base64"),
      limit: 200,
      ids: [10, 20],
      aggregates: ["avg", "stddev"],
      percentile: 0.99,
    };
    const result = validateOutputDataQueryRequest(body);
    assert.isTrue(result.valid);
    if (result.valid) {
      const d = result.data as Record<string, unknown>;
      assert.deepStrictEqual(d["ids"], [10, 20]);
      assert.strictEqual(d["percentile"], 0.99);
    }
  });

  it("should reject invalid cursor", () => {
    const result = validateOutputDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      cursor: Buffer.from("invalid-date").toString("base64"),
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "invalid timestamp");
    }
  });

  it("should reject readingTypes in output request (not applicable)", () => {
    const result = validateOutputDataQueryRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      readingTypes: ["temperature"],
    });
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "Unknown fields");
      assert.include(result.errors[0], "readingTypes");
    }
  });
});

describe("QueryTypes validation — array size limits", () => {
  it("should reject ids array exceeding MAX_ARRAY_SIZE", () => {
    const body = {
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      ids: Array(MAX_ARRAY_SIZE + 1).fill(1),
    };
    const result = validateSensorDataQueryRequest(body);
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "must not exceed");
    }
  });

  it("should accept ids array at MAX_ARRAY_SIZE", () => {
    const body = {
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      ids: Array(MAX_ARRAY_SIZE).fill(1),
    };
    const result = validateSensorDataQueryRequest(body);
    assert.isTrue(result.valid);
  });

  it("should reject readingTypes array exceeding MAX_ARRAY_SIZE", () => {
    const body = {
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      readingTypes: Array(MAX_ARRAY_SIZE + 1).fill("temperature"),
    };
    const result = validateSensorDataQueryRequest(body);
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "must not exceed");
    }
  });

  it("should reject output ids array exceeding MAX_ARRAY_SIZE", () => {
    const body = {
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      ids: Array(MAX_ARRAY_SIZE + 1).fill(1),
    };
    const result = validateOutputDataQueryRequest(body);
    assert.isFalse(result.valid);
    if (!result.valid) {
      assert.include(result.errors[0], "must not exceed");
    }
  });
});
