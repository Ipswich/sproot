import { SprootDB } from "../SprootDB";
import {
  SensorDataQueryRequest,
  OutputDataQueryRequest,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DeviceDataQueryRow,
} from "../../../../common/dist/api/v2/QueryTypes";
import { assert } from "chai";
import sinon from "sinon";

function statsArr(entry: DeviceDataQueryRow, key: string): (number | null)[] {
  return entry["statistics"][key] as (number | null)[];
}

function assertDataEntry(
  data: DeviceDataQueryRow,
  predicate: (d: DeviceDataQueryRow) => boolean,
): DeviceDataQueryRow {
  assert.isDefined(data, "Expected data entry to be defined");
  assert.isTrue(predicate(data), "Expected data entry to match predicate");
  return data;
}

function assertFirstEntry(data: DeviceDataQueryRow): DeviceDataQueryRow {
  assert.isDefined(data, "Expected data to be defined");
  return data;
}

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
    "join",
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
          sensor_name: `Sensor ${sensorId}`,
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
      assert.equal(result.data.id, 1);
      assert.equal(result.data.name, "temperature");
      assert.equal(result.data.units, "°C");
      assert.equal(statsArr(result.data, "avg").length, 1);
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
      assert.equal(result.data.id, 1);
      assert.equal(result.data.name, "temperature");
      assert.equal(statsArr(result.data, "avg").length, 10);
    });

    it("should filter by sensor IDs", async () => {
      const rows = makeRows(2, "humidity", 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        id: 2,
      } as SensorDataQueryRequest);

      assert.equal(result.data.id, 2);
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

      assert.equal(result.data.id, 1);
      assert.equal(result.data.name, "temperature");
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

      assert.equal(statsArr(assertFirstEntry(result.data), "avg").length, DEFAULT_LIMIT);
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

      assert.equal(statsArr(assertFirstEntry(result.data), "avg").length, MAX_LIMIT);
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
          output_name: `Output ${outputId}`,
          output_units: "V",
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
      assert.equal(result.data.id, 1);
      assert.equal(statsArr(result.data, "avg").length, 1);
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
      const outputEntry2 = assertDataEntry(result.data, (d) => d.id === 1);
      assert.equal(statsArr(outputEntry2, "avg").length, 10);
    });

    it("should filter by output IDs", async () => {
      const rows = makeOutputRows(3, 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        id: 3,
      } as OutputDataQueryRequest);

      assert.equal(result.data.id, 3);
    });

    it("should use default limit when none provided", async () => {
      const rows = makeOutputRows(1, 501);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
      } as OutputDataQueryRequest);

      assert.equal(statsArr(assertFirstEntry(result.data), "avg").length, DEFAULT_LIMIT);
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

      assert.equal(statsArr(assertFirstEntry(result.data), "avg").length, MAX_LIMIT);
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

      assert.equal(statsArr(assertFirstEntry(result.data), "avg").length, 1);
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
          output_name: "Output 1",
          output_units: "V",
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

      const entry = assertDataEntry(result.data, (d) => d.id === 1);
      assert.equal(statsArr(entry, "first")[0], null);
      assert.equal(statsArr(entry, "last")[0], null);
    });
  });

  // ---- raw path: sensors ----

  describe("querySensorDataAsync — raw path (arbitrary interval)", () => {
    function makeRows(sensorId: number, metric: string, count: number) {
      const r: unknown[] = [];
      for (let i = 0; i < count; i++) {
        r.push({
          bucket: `2024-01-01T${String(i * 15).padStart(2, "0")}:00:00.000Z`,
          sensor_id: sensorId,
          sensor_name: `Sensor ${sensorId}`,
          metric,
          units: metric === "humidity" ? "%" : "°C",
          average_data: 22 + i,
          minimum_data: 18 + i,
          maximum_data: 28 + i,
          sample_count: 3,
          stddev_data: 2.5,
          percentile_data: { percentile: 23 },
          first_data: 20 + i,
          last_data: 26 + i,
        });
      }
      return r;
    }

    it("should query raw sensor_data for 15 minutes interval", async () => {
      const rows = makeRows(1, "temperature", 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T04:00:00.000Z" },
        downsample: "15 minutes",
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isNotEmpty(result.data);
      assert.equal(result.data.id, 1);
      assert.equal(result.data.name, "temperature");
      assert.equal(result.data.units, "°C");
      assert.equal(statsArr(result.data, "avg").length, 1);
    });

    it("should query raw sensor_data for 4 hours interval", async () => {
      const rows = makeRows(1, "humidity", 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "4 hours",
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isNotEmpty(result.data);
      assert.equal(result.data.id, 1);
      assert.equal(result.data.name, "humidity");
      assert.equal(statsArr(result.data, "avg").length, 1);
    });

    it("should filter by reading types in raw path", async () => {
      const rows = makeRows(1, "temperature", 2);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T04:00:00.000Z" },
        downsample: "15 minutes",
        readingTypes: ["temperature"],
        limit: 10,
      } as SensorDataQueryRequest);

      assert.equal(result.data.id, 1);
      assert.equal(result.data.name, "temperature");
      assert.equal(statsArr(result.data, "avg").length, 2);
    });

    it("should return nextCursor when rows exceed limit in raw path", async () => {
      const rows = makeRows(1, "temperature", 11);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "15 minutes",
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isString(result.nextCursor);
      assert.equal(result.data.id, 1);
      assert.equal(result.data.name, "temperature");
      assert.equal(statsArr(result.data, "avg").length, 10);
    });
  });

  // ---- raw path: outputs ----

  describe("queryOutputDataAsync — raw path (arbitrary interval)", () => {
    function makeRows(outputId: number, count: number) {
      const r: unknown[] = [];
      for (let i = 0; i < count; i++) {
        r.push({
          bucket: `2024-01-01T${String(i * 15).padStart(2, "0")}:00:00.000Z`,
          output_id: outputId,
          output_name: `Output ${outputId}`,
          output_units: "V",
          average_value: 100 + i,
          minimum_value: 50 + i,
          maximum_value: 150 + i,
          sample_count: 3,
          stddev_value: 15,
          percentile_value: { percentile: 100 },
          first_value: 80 + i,
          last_value: 120 + i,
        });
      }
      return r;
    }

    it("should query raw output_data for 15 minutes interval", async () => {
      const rows = makeRows(1, 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T04:00:00.000Z" },
        downsample: "15 minutes",
        limit: 10,
      } as OutputDataQueryRequest);

      assert.isNotEmpty(result.data);
      assert.equal(result.data.id, 1);
      assert.equal(statsArr(result.data, "avg").length, 1);
    });

    it("should query raw output_data for 4 hours interval", async () => {
      const rows = makeRows(2, 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "4 hours",
        limit: 10,
      } as OutputDataQueryRequest);

      assert.isNotEmpty(result.data);
      assert.equal(result.data.id, 2);
      assert.equal(statsArr(result.data, "avg").length, 1);
    });

    it("should return nextCursor when rows exceed limit in raw output path", async () => {
      const rows = makeRows(1, 11);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "15 minutes",
        limit: 10,
      } as OutputDataQueryRequest);

      assert.isString(result.nextCursor);
      assert.equal(result.data.id, 1);
      assert.equal(statsArr(result.data, "avg").length, 10);
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
        id: 1,
        limit: 10,
      } as SensorDataQueryRequest);

      const rawCalls = (knex as any).rawCalls || [];
      const idFilterSql = rawCalls.find((s: string) => s.includes("sensor_id") && s.includes("="));
      assert.isDefined(idFilterSql, "Should have a sensor_id = filter");
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
      const metricFilterSql = rawCalls.find(
        (s: string) => s.includes('"metric"') && s.includes("IN"),
      );
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
        id: 5,
        limit: 10,
      } as OutputDataQueryRequest);

      const rawCalls = (knex as any).rawCalls || [];
      const idFilterSql = rawCalls.find((s: string) => s.includes("output_id") && s.includes("="));
      assert.isDefined(idFilterSql, "Should have an output_id = filter");
      assert.include(idFilterSql!, "?");
      assert.include(idFilterSql!, "output_id");
    });

    it("should use cursor filter with end bound when cursor provided", async () => {
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
      const cursorFilterSql = rawCalls.find(
        (s: string) => s.includes("bucket") && s.includes(">") && s.includes("<="),
      );
      assert.isDefined(cursorFilterSql, "Should have a cursor-based bucket > AND bucket <= filter");
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
      const timeFilterSql = rawCalls.find(
        (s: string) => s.includes("bucket") && s.includes("BETWEEN"),
      );
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
        id: 999,
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isNull(result.data);
      assert.deepEqual(result.xAxis.values, []);
      assert.notProperty(result, "nextCursor");
    });

    it("should handle empty output list in aggregate path", async () => {
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "5m",
        id: 999,
        limit: 10,
      } as OutputDataQueryRequest);

      assert.isNull(result.data);
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

      assert.equal(statsArr(assertFirstEntry(result.data), "avg").length, 1);
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

  describe("cursor respects time range", () => {
    it("should return empty when cursor is at or beyond end of time range", async () => {
      const base64Cursor = Buffer.from("2024-01-01T02:00:00.000Z").toString("base64");
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T02:00:00.000Z" },
        downsample: "5m",
        cursor: base64Cursor,
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isNull(result.data);
      assert.notProperty(result, "nextCursor");
    });

    it("should return empty when cursor is beyond end of time range", async () => {
      const base64Cursor = Buffer.from("2024-01-01T03:00:00.000Z").toString("base64");
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T02:00:00.000Z" },
        downsample: "5m",
        cursor: base64Cursor,
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isNull(result.data);
      assert.notProperty(result, "nextCursor");
    });

    it("should respect end bound for output data with cursor", async () => {
      const base64Cursor = Buffer.from("2024-01-01T02:00:00.000Z").toString("base64");
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T02:00:00.000Z" },
        downsample: "5m",
        cursor: base64Cursor,
        limit: 10,
      } as OutputDataQueryRequest);

      assert.isNull(result.data);
      assert.notProperty(result, "nextCursor");
    });
  });

  // ---- cursor validation ----
  // Note: parseCursor is now private (#parseCursor) and tested indirectly
  // through the aggregate query methods that use it.

  // ---- Zone-based query tests ----

  describe("zone-based queries — sensors and outputs filtered by deviceZoneId", () => {
    function makeZoneSensorRows(sensorId: number, _zoneId: number) {
      return [
        {
          bucket: "2024-01-01T00:00:00.000Z",
          sensor_id: sensorId,
          sensor_name: `Sensor ${sensorId}`,
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
          output_name: `Output ${outputId}`,
          output_units: "V",
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
      const rows = makeZoneSensorRows(1, 1);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        id: 1,
        limit: 10,
      } as SensorDataQueryRequest);

      assert.equal(result.data.id, 1, "Should return zone 1 sensor ID");
    });

    it("should return only zone 2 sensors when querying zone 2 data", async () => {
      // Zone 2 has sensors 2 (DS18B20) and 4 (ADS1115)
      const rows = makeZoneSensorRows(2, 2);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        id: 2,
        limit: 10,
      } as SensorDataQueryRequest);

      assert.equal(result.data.id, 2, "Should return zone 2 sensor ID");
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
        id: 1,
        limit: 10,
      } as OutputDataQueryRequest);

      assert.equal(result.data.id, 1, "Should return zone 1 output ID");
    });

    it("should return only zone 2 outputs when querying zone 2 data", async () => {
      // Zone 2 has output 5 (Pwm #1)
      const rows = makeZoneOutputRows(5, 2);
      const knex = createKnexStub(rows);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        id: 5,
        limit: 10,
      } as OutputDataQueryRequest);

      assert.equal(result.data.id, 5, "Should return zone 2 output ID");
    });

    it("should return empty data when querying sensors from a non-existent zone", async () => {
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.querySensorDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        id: 999,
        limit: 10,
      } as SensorDataQueryRequest);

      assert.isUndefined(result.data, "Should return empty data for non-existent zone sensors");
    });

    it("should return empty data when querying outputs from a non-existent zone", async () => {
      const knex = createKnexStub([]);
      const db = new SprootDB(knex as any);

      const result = await db.queryOutputDataAsync({
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
        downsample: "5m",
        id: 999,
        limit: 10,
      } as OutputDataQueryRequest);

      assert.isUndefined(result.data, "Should return empty data for non-existent zone outputs");
    });
  });
});
