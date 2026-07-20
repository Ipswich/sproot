import { assert } from "chai";
import request from "supertest";
import { MAX_LIMIT } from "@sproot/sproot-common/dist/api/v2/QueryTypes";
import { server } from "./setup";

const SENSOR_TIME_RANGE = {
  "timeRange.start": "2024-01-01T00:00:00.000Z",
  "timeRange.end": "2024-01-02T00:00:00.000Z",
};

const OUTPUT_TIME_RANGE = {
  "timeRange.start": "2024-01-01T00:00:00.000Z",
  "timeRange.end": "2024-01-02T00:00:00.000Z",
};

describe("DataQuery API - Sensor Data", function () {
  this.timeout(10000);

  it("GET /sensors/:id/data returns a single sensor data object with default aggregates", async () => {
    const response = await request(server)
      .get("/api/v2/sensors/1/data")
      .query({
        ...SENSOR_TIME_RANGE,
        readingTypes: ["temperature"],
      })
      .expect(200);

    const content = response.body["content"];
    assert.deepEqual(Object.keys(content.data.statistics), ["avg", "min", "max"]);
    assert.equal(content.data.id, 1);
    assert.equal(content.data.name, "temperature");
    assert.isAbove(content.xAxis.values.length, 0);
    assert.equal(content.data.statistics.avg.length, content.xAxis.values.length);
  });

  it("GET /sensors/:id/data returns null for unsupported reading types", async () => {
    const response = await request(server)
      .get("/api/v2/sensors/1/data")
      .query({
        ...SENSOR_TIME_RANGE,
        readingTypes: ["moisture"],
      })
      .expect(200);

    const content = response.body["content"];
    assert.isNull(content.data);
    assert.deepEqual(content.xAxis.values, []);
  });

  it("GET /sensors/:id/data respects limit and emits nextCursor", async () => {
    const response = await request(server)
      .get("/api/v2/sensors/3/data")
      .query({
        ...SENSOR_TIME_RANGE,
        readingTypes: ["moisture"],
        limit: 5,
      })
      .expect(200);

    const content = response.body["content"];
    assert.lengthOf(content.xAxis.values, 5);
    assert.isString(content.nextCursor);
    assert.equal(content.data.statistics.avg.length, 5);
  });

  it("GET /sensors/:id/data cursor pagination advances without overlap", async () => {
    const firstResponse = await request(server)
      .get("/api/v2/sensors/4/data")
      .query({
        ...SENSOR_TIME_RANGE,
        readingTypes: ["voltage"],
        limit: 5,
      })
      .expect(200);

    const firstContent = firstResponse.body["content"];
    const firstPageTimestamps = firstContent.xAxis.values as string[];

    const secondResponse = await request(server)
      .get("/api/v2/sensors/4/data")
      .query({
        ...SENSOR_TIME_RANGE,
        readingTypes: ["voltage"],
        limit: 5,
        cursor: firstContent.nextCursor,
      })
      .expect(200);

    const secondContent = secondResponse.body["content"];
    const secondPageTimestamps = secondContent.xAxis.values as string[];

    assert.isAbove(secondPageTimestamps.length, 0);
    assert.isBelow(
      new Date(secondPageTimestamps[0]!).getTime(),
      new Date(firstPageTimestamps[firstPageTimestamps.length - 1]!).getTime(),
    );
    assert.isFalse(
      secondPageTimestamps.some((timestamp) => firstPageTimestamps.includes(timestamp)),
    );
  });

  it("GET /sensors/:id/data returns 400 when limit exceeds max", async () => {
    await request(server)
      .get("/api/v2/sensors/1/data")
      .query({
        ...SENSOR_TIME_RANGE,
        limit: MAX_LIMIT + 1,
      })
      .expect(400);
  });

  it("GET /sensors/:id/data returns 400 for invalid percentile", async () => {
    await request(server)
      .get("/api/v2/sensors/1/data")
      .query({
        ...SENSOR_TIME_RANGE,
        readingTypes: ["temperature"],
        aggregates: ["percentile"],
        percentile: 2,
      })
      .expect(400);
  });

  it("GET /sensors/:id/data supports raw-path downsample intervals", async () => {
    const response = await request(server)
      .get("/api/v2/sensors/1/data")
      .query({
        ...SENSOR_TIME_RANGE,
        readingTypes: ["temperature"],
        downsample: "15 minutes",
        aggregates: ["avg", "max"],
      })
      .expect(200);

    const content = response.body["content"];
    assert.isAbove(content.xAxis.values.length, 0);
    assert.deepEqual(Object.keys(content.data.statistics), ["avg", "max"]);
  });
});

describe("DataQuery API - Output Data", function () {
  this.timeout(10000);

  it("GET /outputs/:id/data returns a single output data object with default aggregates", async () => {
    const response = await request(server)
      .get("/api/v2/outputs/1/data")
      .query(OUTPUT_TIME_RANGE)
      .expect(200);

    const content = response.body["content"];
    assert.deepEqual(Object.keys(content.data.statistics), ["avg", "min", "max"]);
    assert.equal(content.data.id, 1);
    assert.isAbove(content.xAxis.values.length, 0);
    assert.equal(content.data.statistics.avg.length, content.xAxis.values.length);
  });

  it("GET /outputs/:id/data respects limit and emits nextCursor", async () => {
    const response = await request(server)
      .get("/api/v2/outputs/1/data")
      .query({
        ...OUTPUT_TIME_RANGE,
        limit: 5,
      })
      .expect(200);

    const content = response.body["content"];
    assert.lengthOf(content.xAxis.values, 5);
    assert.isString(content.nextCursor);
    assert.equal(content.data.statistics.avg.length, 5);
  });

  it("GET /outputs/:id/data cursor pagination advances without overlap", async () => {
    const firstResponse = await request(server)
      .get("/api/v2/outputs/1/data")
      .query({
        ...OUTPUT_TIME_RANGE,
        limit: 2,
      })
      .expect(200);

    const firstContent = firstResponse.body["content"];
    const firstPageTimestamps = firstContent.xAxis.values as string[];

    const secondResponse = await request(server)
      .get("/api/v2/outputs/1/data")
      .query({
        ...OUTPUT_TIME_RANGE,
        limit: 2,
        cursor: firstContent.nextCursor,
      })
      .expect(200);

    const secondContent = secondResponse.body["content"];
    const secondPageTimestamps = secondContent.xAxis.values as string[];

    assert.isAbove(secondPageTimestamps.length, 0);
    assert.isBelow(
      new Date(secondPageTimestamps[0]!).getTime(),
      new Date(firstPageTimestamps[firstPageTimestamps.length - 1]!).getTime(),
    );
    assert.isFalse(
      secondPageTimestamps.some((timestamp) => firstPageTimestamps.includes(timestamp)),
    );
  });

  it("GET /outputs/:id/data returns 400 when limit exceeds max", async () => {
    await request(server)
      .get("/api/v2/outputs/1/data")
      .query({
        ...OUTPUT_TIME_RANGE,
        limit: MAX_LIMIT + 1,
      })
      .expect(400);
  });

  it("GET /outputs/:id/data returns 400 for invalid percentile", async () => {
    await request(server)
      .get("/api/v2/outputs/1/data")
      .query({
        ...OUTPUT_TIME_RANGE,
        aggregates: ["percentile"],
        percentile: 2,
      })
      .expect(400);
  });

  it("GET /outputs/:id/data supports raw-path downsample intervals", async () => {
    const response = await request(server)
      .get("/api/v2/outputs/1/data")
      .query({
        ...OUTPUT_TIME_RANGE,
        downsample: "15 minutes",
        aggregates: ["avg", "max"],
      })
      .expect(200);

    const content = response.body["content"];
    assert.isAbove(content.xAxis.values.length, 0);
    assert.deepEqual(Object.keys(content.data.statistics), ["avg", "max"]);
  });
});
