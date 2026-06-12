import { SprootDB } from "../SprootDB";
import {
  SensorDataQueryRequest,
  OutputDataQueryRequest,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "../../../../common/dist/api/v2/QueryTypes";
import { assert } from "chai";
import sinon from "sinon";

// ---------------------------------------------------------------------------
// Helpers — sinon-based Knex stubs
// ---------------------------------------------------------------------------

function createQueryBuilderStub(rows: unknown[]): any {
  const builder: any = {};
  builder.then = (onfulfilled: (value: unknown) => unknown) =>
    Promise.resolve(rows).then(onfulfilled);

  const chainMethods = [
    "select",
    "where",
    "whereRaw",
    "whereBetween",
    "whereIn",
    "whereNull",
    "whereNotNull",
    "distinct",
    "orderBy",
    "limit",
    "groupByRaw",
  ];
  for (const method of chainMethods) {
    builder[method] = sinon.stub().callsFake(() => builder);
  }

  builder.toQuery = sinon.stub().returns("SELECT * FROM test");
  return builder;
}

function createKnexStub(rows: unknown[]): any {
  const builder = createQueryBuilderStub(rows);
  const knex: any = function (_tableName?: string) {
    return builder;
  };
  knex.raw = function (sql: string) {
    const rawObj: any = function () {
      return rawObj;
    };
    rawObj.toQuery = function () {
      return sql;
    };
    rawObj.then = (onfulfilled: (value: unknown) => unknown) => {
      let resolvedValue: unknown;
      if (sql.includes("pg_tables") && sql.includes("tablename IN")) {
        resolvedValue = {
          rows: [
            { tablename: "sensor_data_5m" },
            { tablename: "sensor_data_1h" },
            { tablename: "sensor_data_1d" },
            { tablename: "output_data_5m" },
            { tablename: "output_data_1h" },
            { tablename: "output_data_1d" },
          ],
        };
      } else {
        resolvedValue = { rows: [{ exists: true }] };
      }
      return Promise.resolve(resolvedValue).then(onfulfilled);
    };
    return rawObj;
  };
  return knex;
}

function createKnexStubWithCapture(rows: unknown[]): any {
  const builder = createQueryBuilderStub(rows);
  const rawCalls: string[] = [];
  const knex: any = function (_tableName?: string) {
    return builder;
  };
  knex.rawCalls = rawCalls;
  knex.raw = function (sql: string) {
    rawCalls.push(sql);
    const rawObj: any = function () {
      return rawObj;
    };
    rawObj.toQuery = function () {
      return sql;
    };
    rawObj.then = (onfulfilled: (value: unknown) => unknown) => {
      let resolvedValue: unknown;
      if (sql.includes("pg_tables") && sql.includes("tablename IN")) {
        resolvedValue = {
          rows: [
            { tablename: "sensor_data_5m" },
            { tablename: "sensor_data_1h" },
            { tablename: "sensor_data_1d" },
            { tablename: "output_data_5m" },
            { tablename: "output_data_1h" },
            { tablename: "output_data_1d" },
          ],
        };
      } else {
        resolvedValue = { rows: [{ exists: true }] };
      }
      return Promise.resolve(resolvedValue).then(onfulfilled);
    };
    return rawObj;
  };
  return knex;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SprootDB.ts — querySensorDataAsync and queryOutputDataAsync", () => {
  // ---- aggregate path: sensors ----

  describe("querySensorDataAsync — aggregate path", () => {
    function makeRows(sensorId: number, metric: string, count: number, hourOffset: number = 0) {
      const r: unknown[] = [];
      for (let i = 0; i < count; i++) {
        r.push({
          bucket: `2024-01-01T${String(hourOffset + i).padStart(2, "0")}:00:00.000Z`,
          sensor_id: sensorId,
          metric,
          units: metric === "humidity" ? "%" : "°C",
          average_data: 25,
          minimum_data: 20,
          maximum_data: 30,
          sample_count: 60,
          stddev_data: 3,
          percentile_data: { percentile: 25 },
          first_data: 22,
          last_data: 28,
        });
      }
      return r;
    }

    it("should return data for 5m downsample", async () => {
      const rows = makeRows(1, "temperature", 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isNotEmpty(result.data);
      assert.notProperty(result, "nextCursor");
      assert.isDefined((result.data as any)[1]);
      assert.equal((result.data as any)[1]["temperature"].units, "°C");
      assert.equal((result.data as any)[1]["temperature"].values.length, 1);
    });

    it("should return nextCursor when rows exceed limit", async () => {
      const rows = makeRows(1, "temperature", 11);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T10:00:00.000Z" },
        downsample: "5m",
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isString(result.nextCursor);
      assert.equal((result.data as any)[1]["temperature"].values.length, 10);
    });

    it("should filter by sensor IDs", async () => {
      const rows = makeRows(2, "humidity", 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        ids: [2, 3],
      } as SensorDataQueryRequest);

      assert.isDefined((result.data as any)[2]);
      assert.equal(Object.keys(result.data).length, 1);
    });

    it("should filter by reading types", async () => {
      const rows = makeRows(1, "temperature", 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        readingTypes: ["temperature"],
      } as SensorDataQueryRequest);

      assert.isDefined((result.data as any)[1]["temperature"]);
    });

    it("should handle cursor-based pagination", async () => {
      const rows = makeRows(1, "temperature", 1, 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const originalCursor = "2024-01-01T00:30:00.000Z";
      const base64Cursor = Buffer.from(originalCursor).toString("base64");

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T02:00:00.000Z" },
        downsample: "5m",
        cursor: base64Cursor,
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isNotEmpty(result.data);
    });

    it("should handle 1h and 1d downsample intervals", async () => {
      const rows = makeRows(1, "temperature", 1);

      // 1h
      const knex1h = createKnexStub(rows);
      const db1h = new SprootDB(knex1h as any);
      const r1h = await db1h.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "1h",
        limit: 10,
      } as SensorDataQueryRequest);
      assert.isNotEmpty(r1h.data);

      // 1d
      const knex1d = createKnexStub(rows);
      const db1d = new SprootDB(knex1d as any);
      const r1d = await db1d.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-03-01T00:00:00.000Z" },
        downsample: "1d",
        limit: 10,
      } as SensorDataQueryRequest);
      assert.isNotEmpty(r1d.data);
    });

    it("should use default limit when none provided", async () => {
      const rows = makeRows(1, "temperature", 501);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
      } as SensorDataQueryRequest);

      assert.equal((result.data as any)[1]["temperature"].values.length, DEFAULT_LIMIT);
      assert.isString(result.nextCursor);
    });

    it("should cap limit at MAX_LIMIT", async () => {
      const rows = makeRows(1, "temperature", 10001);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        limit: 20000,
      } as SensorDataQueryRequest);

      assert.equal((result.data as any)[1]["temperature"].values.length, MAX_LIMIT);
      assert.isString(result.nextCursor);
    });
  });

  // ---- aggregate path: outputs ----

  describe("queryOutputDataAsync — aggregate path", () => {
    function makeOutputRows(outputId: number, count: number, hourOffset: number = 0) {
      const r: unknown[] = [];
      for (let i = 0; i < count; i++) {
        r.push({
          bucket: `2024-01-01T${String(hourOffset + i).padStart(2, "0")}:00:00.000Z`,
          output_id: outputId,
          average_value: 100,
          minimum_value: 50,
          maximum_value: 150,
          sample_count: 60,
          stddev_value: 10,
          percentile_value: { percentile: 100 },
        });
      }
      return r;
    }

    it("should return data for 5m downsample", async () => {
      const rows = makeOutputRows(1, 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        limit: 10,
      } as OutputDataQueryRequest);

      assert.isNotEmpty(result.data);
      assert.notProperty(result, "nextCursor");
      assert.isDefined((result.data as any)[1]);
      assert.equal((result.data as any)[1].values.length, 1);
    });

    it("should return nextCursor when rows exceed limit", async () => {
      const rows = makeOutputRows(1, 11);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T10:00:00.000Z" },
        downsample: "5m",
        limit: 10,
      } as OutputDataQueryRequest);

      assert.isString(result.nextCursor);
      assert.equal((result.data as any)[1].values.length, 10);
    });

    it("should filter by output IDs", async () => {
      const rows = makeOutputRows(3, 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        ids: [3],
      } as OutputDataQueryRequest);

      assert.isDefined((result.data as any)[3]);
      assert.equal(Object.keys(result.data).length, 1);
    });

    it("should use default limit when none provided", async () => {
      const rows = makeOutputRows(1, 501);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
      } as OutputDataQueryRequest);

      assert.equal((result.data as any)[1].values.length, DEFAULT_LIMIT);
      assert.isString(result.nextCursor);
    });

    it("should cap limit at MAX_LIMIT", async () => {
      const rows = makeOutputRows(1, 10001);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        limit: 20000,
      } as OutputDataQueryRequest);

      assert.equal((result.data as any)[1].values.length, MAX_LIMIT);
      assert.isString(result.nextCursor);
    });

    it("should handle limit=1 correctly", async () => {
      const rows = makeOutputRows(1, 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        limit: 1,
      } as OutputDataQueryRequest);

      assert.equal((result.data as any)[1].values.length, 1);
      assert.notProperty(result, "nextCursor");
    });

    it("should use custom percentile in output aggregate query", async () => {
      const knex = createKnexStub([]);
      const rawSpy = sinon.spy(knex, "raw");
      const db = new SprootDB(knex as any);

      await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        percentile: 0.95,
        limit: 10,
      } as OutputDataQueryRequest);

      const percentileCalls = rawSpy
        .getCalls()
        .filter((c) => c.args[0]?.includes("approx_percentile"));
      assert.isAtLeast(percentileCalls.length, 1);
      assert.equal(percentileCalls[0]!.args[1]?.[0], 0.95);
    });
  });

  // ---- output aggregate path first/last null ----

  describe("output aggregate path — first/last should be null", () => {
    it("should return null for first and last in aggregate path", async () => {
      const rows = [
        {
          bucket: "2024-01-01T00:00:00.000Z",
          output_id: 1,
          average_value: 100,
          minimum_value: 50,
          maximum_value: 150,
          sample_count: 60,
          stddev_value: 10,
          percentile_value: { percentile: 100 },
        },
      ];
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        aggregates: ["first", "last"],
        limit: 10,
      } as OutputDataQueryRequest);

      const value = (result.data as any)[1].values[0];
      assert.equal(value["first"], null);
      assert.equal(value["last"], null);
    });
  });

  // ---- cursor base64 decoding ----

  describe("cursor decoding — base64 cursor decoded before Date()", () => {
    it("should decode base64 cursor before using it as a Date (sensor aggregate path)", async () => {
      const originalCursor = "2024-01-01T00:30:00.000Z";
      const base64Cursor = Buffer.from(originalCursor).toString("base64");

      const rows = [
        {
          bucket: "2024-01-01T01:00:00.000Z",
          sensor_id: 1,
          metric: "temperature",
          units: "°C",
          average_data: 25,
          minimum_data: 20,
          maximum_data: 30,
          sample_count: 60,
          stddev_data: 3,
          percentile_data: { percentile: 25 },
          first_data: 22,
          last_data: 28,
        },
      ];
      const knex = createKnexStub(rows);
      const rawSpy = sinon.spy(knex, "raw");
      const db = new SprootDB(knex as any);

      await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T02:00:00.000Z" },
        downsample: "5m",
        cursor: base64Cursor,
        limit: 10,
      } as SensorDataQueryRequest);

      const cursorCall = rawSpy.getCalls().find((c) => c.args[1]?.[0] instanceof Date);
      const cursorParam = cursorCall!.args[1]?.[0];
      assert.instanceOf(cursorParam, Date, "cursor should be a Date object");
      assert.isFalse(
        isNaN(cursorParam.getTime()),
        "cursor Date should be valid (not Invalid Date)",
      );
      assert.equal(cursorParam.toISOString(), "2024-01-01T00:30:00.000Z");
    });

    it("should decode base64 output cursor before using it as a Date (output aggregate path)", async () => {
      const originalCursor = "2024-01-01T00:30:00.000Z";
      const base64Cursor = Buffer.from(originalCursor).toString("base64");

      const rows = [
        {
          bucket: "2024-01-01T01:00:00.000Z",
          output_id: 1,
          average_value: 100,
          minimum_value: 50,
          maximum_value: 150,
          sample_count: 60,
          stddev_value: 10,
          percentile_value: { percentile: 100 },
        },
      ];
      const knex = createKnexStub(rows);
      const rawSpy = sinon.spy(knex, "raw");
      const db = new SprootDB(knex as any);

      await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T02:00:00.000Z" },
        downsample: "5m",
        cursor: base64Cursor,
        limit: 10,
      } as OutputDataQueryRequest);

      const cursorCall = rawSpy.getCalls().find((c) => c.args[1]?.[0] instanceof Date);
      const cursorParam = cursorCall!.args[1]?.[0];
      assert.instanceOf(cursorParam, Date, "cursor should be a Date object");
      assert.isFalse(
        isNaN(cursorParam.getTime()),
        "cursor Date should be valid (not Invalid Date)",
      );
      assert.equal(cursorParam.toISOString(), "2024-01-01T00:30:00.000Z");
    });
  });

  // ---- SQL generation verification ----

  describe("aggregate filter SQL generation", () => {
    it("should generate correct sensor_id filter SQL", async () => {
      const knex = createKnexStubWithCapture([]);
      const db = new SprootDB(knex as any);

      await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        ids: [1, 2],
        limit: 10,
      } as SensorDataQueryRequest);

      const rawCalls = (knex as any).rawCalls || [];
      const idFilterSql = rawCalls.find((s: string) => s.includes("sensor_id") && s.includes("IN"));
      assert.isDefined(idFilterSql, "Should have a sensor_id IN filter");
      assert.include(idFilterSql!, "?");
      assert.include(idFilterSql!, "sensor_id");
    });

    it("should generate correct metric filter SQL when readingTypes provided", async () => {
      const knex = createKnexStubWithCapture([]);
      const db = new SprootDB(knex as any);

      await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        readingTypes: ["temperature", "humidity"],
        limit: 10,
      } as SensorDataQueryRequest);

      const rawCalls = (knex as any).rawCalls || [];
      const metricFilterSql = rawCalls.find((s: string) => s.includes('"metric"') && s.includes("IN"));
      assert.isDefined(metricFilterSql, "Should have a metric IN filter");
      assert.include(metricFilterSql!, "?");
      assert.include(metricFilterSql!, "metric");
    });

    it("should generate correct output_id filter SQL", async () => {
      const knex = createKnexStubWithCapture([]);
      const db = new SprootDB(knex as any);

      await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        ids: [5, 6],
        limit: 10,
      } as OutputDataQueryRequest);

      const rawCalls = (knex as any).rawCalls || [];
      const idFilterSql = rawCalls.find((s: string) => s.includes("output_id") && s.includes("IN"));
      assert.isDefined(idFilterSql, "Should have an output_id IN filter");
      assert.include(idFilterSql!, "?");
      assert.include(idFilterSql!, "output_id");
    });

    it("should use cursor filter when cursor provided", async () => {
      const base64Cursor = Buffer.from("2024-01-01T00:30:00.000Z").toString("base64");
      const knex = createKnexStubWithCapture([]);
      const db = new SprootDB(knex as any);

      await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T02:00:00.000Z" },
        downsample: "5m",
        cursor: base64Cursor,
        limit: 10,
      } as SensorDataQueryRequest);

      const rawCalls = (knex as any).rawCalls || [];
      const cursorFilterSql = rawCalls.find((s: string) => s.includes("bucket") && s.includes(">"));
      assert.isDefined(cursorFilterSql, "Should have a cursor-based bucket > filter");
    });

    it("should use BETWEEN filter when no cursor", async () => {
      const knex = createKnexStubWithCapture([]);
      const db = new SprootDB(knex as any);

      await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        limit: 10,
      } as SensorDataQueryRequest);

      const rawCalls = (knex as any).rawCalls || [];
      const timeFilterSql = rawCalls.find((s: string) => s.includes("bucket") && s.includes("BETWEEN"));
      assert.isDefined(timeFilterSql, "Should have a BETWEEN filter for time range");
    });
  });

  // ---- Edge cases ----

  describe("edge cases", () => {
    it("should handle empty sensor list in aggregate path", async () => {
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        ids: [999],
        limit: 10,
      } as SensorDataQueryRequest);

      assert.deepEqual(result.data, {});
      assert.notProperty(result, "nextCursor");
    });

    it("should handle empty output list in aggregate path", async () => {
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        ids: [999],
        limit: 10,
      } as OutputDataQueryRequest);

      assert.deepEqual(result.data, {});
      assert.notProperty(result, "nextCursor");
    });

    it("should handle limit=1 correctly", async () => {
      const rows = [
        {
          bucket: "2024-01-01T00:00:00.000Z",
          sensor_id: 1,
          metric: "temperature",
          units: "°C",
          average_data: 25,
          minimum_data: 20,
          maximum_data: 30,
          sample_count: 60,
          stddev_data: 3,
          percentile_data: { percentile: 25 },
          first_data: 22,
          last_data: 28,
        },
      ];
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        limit: 1,
      } as SensorDataQueryRequest);

      assert.equal((result.data as any)[1]["temperature"].values.length, 1);
      assert.notProperty(result, "nextCursor");
    });

    it("should use custom percentile in sensor aggregate query", async () => {
      const knex = createKnexStub([]);
      const rawSpy = sinon.spy(knex, "raw");
      const db = new SprootDB(knex as any);

      await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        percentile: 0.9,
        limit: 10,
      } as SensorDataQueryRequest);

      const percentileCalls = rawSpy
        .getCalls()
        .filter((c) => c.args[0]?.includes("approx_percentile"));
      assert.isAtLeast(percentileCalls.length, 1);
      assert.equal(percentileCalls[0]!.args[1]?.[0], 0.9);
    });

    it("should use default percentile (0.5) in sensor aggregate query", async () => {
      const knex = createKnexStub([]);
      const rawSpy = sinon.spy(knex, "raw");
      const db = new SprootDB(knex as any);

      await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        limit: 10,
      } as SensorDataQueryRequest);

      const percentileCalls = rawSpy
        .getCalls()
        .filter((c) => c.args[0]?.includes("approx_percentile"));
      assert.isAtLeast(percentileCalls.length, 1);
      assert.equal(percentileCalls[0]!.args[1]?.[0], 0.5);
    });

    it("should use custom percentile in output aggregate query", async () => {
      const knex = createKnexStub([]);
      const rawSpy = sinon.spy(knex, "raw");
      const db = new SprootDB(knex as any);

      await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        percentile: 0.95,
        limit: 10,
      } as OutputDataQueryRequest);

      const percentileCalls = rawSpy
        .getCalls()
        .filter((c) => c.args[0]?.includes("approx_percentile"));
      assert.isAtLeast(percentileCalls.length, 1);
      assert.equal(percentileCalls[0]!.args[1]?.[0], 0.95);
    });
  });

  // ---- cursor validation ----

  describe("parseCursor — cursor validation", () => {
    it("should return undefined for undefined cursor", () => {
      const db = new SprootDB(createKnexStub([]) as any);
      assert.isUndefined((db as any).parseCursor(undefined));
    });

    it("should return undefined for empty string cursor", () => {
      const db = new SprootDB(createKnexStub([]) as any);
      assert.isUndefined((db as any).parseCursor(""));
    });

    it("should return valid Date for valid base64-encoded ISO timestamp", () => {
      const db = new SprootDB(createKnexStub([]) as any);
      const validISO = new Date("2024-01-01T12:00:00.000Z").toISOString();
      const encoded = Buffer.from(validISO).toString("base64");
      const result = (db as any).parseCursor(encoded);
      assert.instanceOf(result, Date);
      assert.strictEqual(result?.toISOString(), validISO);
    });

    it("should throw for non-date base64 content", () => {
      const db = new SprootDB(createKnexStub([]) as any);
      const encoded = Buffer.from("not-a-date").toString("base64");
      assert.throws(() => (db as any).parseCursor(encoded), /Invalid cursor/);
    });

    it("should throw for invalid base64 string", () => {
      const db = new SprootDB(createKnexStub([]) as any);
      assert.throws(() => (db as any).parseCursor("!!!invalid-base64!!!"), /Invalid cursor/);
    });

    it("should throw for valid base64 but invalid date", () => {
      const db = new SprootDB(createKnexStub([]) as any);
      const encoded = Buffer.from("2024-13-45T99:99:99.999Z").toString("base64");
      assert.throws(() => (db as any).parseCursor(encoded), /Invalid cursor/);
    });
  });

  // ---- Zone-based query tests ----

  describe("zone-based queries — sensors and outputs filtered by deviceZoneId", () => {
    function makeZoneSensorRows(sensorId: number, _zoneId: number) {
      return [
        {
          bucket: "2024-01-01T00:00:00.000Z",
          sensor_id: sensorId,
          metric: "temperature",
          units: "°C",
          average_data: 25,
          minimum_data: 20,
          maximum_data: 30,
          sample_count: 60,
          stddev_data: 3,
          percentile_data: { percentile: 25 },
          first_data: 22,
          last_data: 28,
        },
      ];
    }

    function makeZoneOutputRows(outputId: number, _zoneId: number) {
      return [
        {
          bucket: "2024-01-01T00:00:00.000Z",
          output_id: outputId,
          average_value: 100,
          minimum_value: 50,
          maximum_value: 150,
          sample_count: 60,
          stddev_value: 10,
          percentile_value: { percentile: 100 },
        },
      ];
    }

    it("should return only zone 1 sensors when querying zone 1 data", async () => {
      // Zone 1 has sensors 1 (BME280) and 3 (Capacitive Moisture Sensor)
      // Zone 2 has sensors 2 (DS18B20) and 4 (ADS1115)
      const rows = [...makeZoneSensorRows(1, 1), ...makeZoneSensorRows(3, 1)];
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        ids: [1, 3],
        limit: 10,
      } as SensorDataQueryRequest);

      const sensorIds = Object.keys(result.data);
      assert.includeMembers(sensorIds, ["1", "3"], "Should return zone 1 sensor IDs");
      assert.equal(sensorIds.length, 2, "Should return exactly 2 zone 1 sensors");
    });

    it("should return only zone 2 sensors when querying zone 2 data", async () => {
      // Zone 2 has sensors 2 (DS18B20) and 4 (ADS1115)
      const rows = [...makeZoneSensorRows(2, 2), ...makeZoneSensorRows(4, 2)];
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        ids: [2, 4],
        limit: 10,
      } as SensorDataQueryRequest);

      const sensorIds = Object.keys(result.data);
      assert.includeMembers(sensorIds, ["2", "4"], "Should return zone 2 sensor IDs");
      assert.equal(sensorIds.length, 2, "Should return exactly 2 zone 2 sensors");
    });

    it("should return only zone 1 outputs when querying zone 1 data", async () => {
      // Zone 1 has output 1 (Relay #1)
      // Zone 2 has output 5 (Pwm #1)
      const rows = makeZoneOutputRows(1, 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        ids: [1],
        limit: 10,
      } as OutputDataQueryRequest);

      const outputIds = Object.keys(result.data);
      assert.includeMembers(outputIds, ["1"], "Should return zone 1 output ID");
      assert.equal(outputIds.length, 1, "Should return exactly 1 zone 1 output");
    });

    it("should return only zone 2 outputs when querying zone 2 data", async () => {
      // Zone 2 has output 5 (Pwm #1)
      const rows = makeZoneOutputRows(5, 2);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        ids: [5],
        limit: 10,
      } as OutputDataQueryRequest);

      const outputIds = Object.keys(result.data);
      assert.includeMembers(outputIds, ["5"], "Should return zone 2 output ID");
      assert.equal(outputIds.length, 1, "Should return exactly 1 zone 2 output");
    });

    it("should return empty data when querying sensors from a non-existent zone", async () => {
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        ids: [999],
        limit: 10,
      } as SensorDataQueryRequest);

      assert.deepEqual(result.data, {}, "Should return empty data for non-existent zone sensors");
    });

    it("should return empty data when querying outputs from a non-existent zone", async () => {
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        ids: [999],
        limit: 10,
      } as OutputDataQueryRequest);

      assert.deepEqual(result.data, {}, "Should return empty data for non-existent zone outputs");
    });
  });
});
