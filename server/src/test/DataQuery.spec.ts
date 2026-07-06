import { assert } from "chai";
import request from "supertest";
import { server } from "./setup";

describe("DataQuery API - Sensor Pagination", function () {
  this.timeout(10000);

  it("GET /sensor-data/query returns paginated results with default limit", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["temperature"],
      })
      .expect(200);

    const content = response.body["content"];
    assert.isObject(content.data);
    assert.isObject(content.data[1]);
    assert.exists(content.data[1]["temperature"]);
    assert.isArray(content.data[1]["temperature"].values);
    assert.isAbove(content.data[1]["temperature"].values.length, 0);
    if (content.nextCursor) {
      assert.isString(content.nextCursor);
    }
    assert.property(content.data[1]["temperature"].values[0], "time");
  });

  it("GET /sensor-data/query respects custom limit parameter", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["temperature"],
        ids: [2],
        limit: 5,
      })
      .expect(200);

    const content = response.body["content"];
    assert.equal(content.data[2]["temperature"].values.length, 5);
    assert.exists(content.nextCursor);
    assert.isString(content.nextCursor);
  });

  it("GET /sensor-data/query returns nextCursor for pagination", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["moisture"],
        ids: [3],
        limit: 10,
      })
      .expect(200);

    const content = response.body["content"];
    assert.isString(content.nextCursor);
    assert.isAbove(content.nextCursor.length, 0);
    assert.equal(content.data[3]["moisture"].values.length, 10);
  });

  it("GET /sensor-data/query with valid cursor returns next page", async () => {
    const firstResponse = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["voltage"],
        ids: [4],
        limit: 5,
      })
      .expect(200);

    const firstContent = firstResponse.body["content"];
    const nextCursor = firstContent.nextCursor as string;
    const lastTimeFirstPage =
      firstContent.data[4]["voltage"].values[firstContent.data[4]["voltage"].values.length - 1]
        .time;

    const secondResponse = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["voltage"],
        ids: [4],
        limit: 5,
        cursor: nextCursor,
      })
      .expect(200);

    const secondContent = secondResponse.body["content"];
    assert.isArray(secondContent.data[4]["voltage"].values);
    assert.isAbove(secondContent.data[4]["voltage"].values.length, 0);
    assert.isAbove(
      new Date(secondContent.data[4]["voltage"].values[0].time).getTime(),
      new Date(lastTimeFirstPage).getTime(),
    );
  });

  it("GET /sensor-data/query with invalid cursor returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["temperature"],
        cursor: "invalidcursor!!!",
      })
      .expect(400);

    const error = response.body["error"];
    assert.exists(error);
    assert.isArray(error.details);
    assert.include(error.details[0].toLowerCase(), "cursor");
  });

  it("GET /sensor-data/query returns all reading types when multiple specified", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["temperature", "humidity", "moisture"],
        ids: [1, 2, 3],
        limit: 200,
      })
      .expect(200);

    const content = response.body["content"];
    assert.exists(content.data[1]["temperature"]);
    assert.exists(content.data[2]["temperature"]);
    assert.exists(content.data[3]["moisture"]);
    assert.isArray(content.data[1]["temperature"].values);
    assert.isArray(content.data[2]["temperature"].values);
    assert.isArray(content.data[3]["moisture"].values);

    const totalValues =
      content.data[1]["temperature"].values.length +
      content.data[2]["temperature"].values.length +
      content.data[3]["moisture"].values.length;
    assert.isAbove(totalValues, 0);
  });
});

describe("DataQuery API - Sensor Aggregates", function () {
  this.timeout(10000);

  it("GET /sensors/data returns sensor data with min aggregate", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        aggregates: ["min"],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1]["temperature"].values);
    assert.isAbove(content.data[1]["temperature"].values.length, 0);
    assert.property(content.data[1]["temperature"].values[0], "min");
    assert.isNumber(content.data[1]["temperature"].values[0].min);
  });

  it("GET /sensors/data returns sensor data with max aggregate", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        aggregates: ["max"],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[2]["temperature"].values);
    assert.isAbove(content.data[2]["temperature"].values.length, 0);
    assert.property(content.data[2]["temperature"].values[0], "max");
  });

  it("GET /sensors/data returns sensor data with avg aggregate", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["moisture"],
        aggregates: ["avg"],
        ids: [3],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[3]["moisture"].values);
    assert.isAbove(content.data[3]["moisture"].values.length, 0);
    assert.property(content.data[3]["moisture"].values[0], "avg");
  });

  it("GET /sensors/data returns sensor data with count aggregate", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["voltage"],
        aggregates: ["count"],
        ids: [4],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[4]["voltage"].values);
    assert.isAbove(content.data[4]["voltage"].values.length, 0);
    assert.property(content.data[4]["voltage"].values[0], "count");
    assert.isNumber(content.data[4]["voltage"].values[0].count);
  });

  it("GET /sensors/data returns sensor data with sum aggregate", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        aggregates: ["sum"],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1]["temperature"].values);
    assert.isAbove(content.data[1]["temperature"].values.length, 0);
    assert.property(content.data[1]["temperature"].values[0], "sum");
  });

  it("GET /sensors/data returns sensor data with stddev aggregate", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        aggregates: ["stddev"],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[2]["temperature"].values);
    assert.isAbove(content.data[2]["temperature"].values.length, 0);
    assert.property(content.data[2]["temperature"].values[0], "stddev");
  });

  it("GET /sensors/data returns sensor data with percentile aggregate", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["moisture"],
        aggregates: ["percentile"],
        percentile: 0.9,
        ids: [3],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[3]["moisture"].values);
    assert.isAbove(content.data[3]["moisture"].values.length, 0);
    assert.property(content.data[3]["moisture"].values[0], "percentile");
  });

  it("GET /sensors/data returns sensor data with first aggregate", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["voltage"],
        aggregates: ["first"],
        ids: [4],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[4]["voltage"].values);
    assert.isAbove(content.data[4]["voltage"].values.length, 0);
    assert.property(content.data[4]["voltage"].values[0], "first");
  });

  it("GET /sensors/data returns sensor data with last aggregate", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        aggregates: ["last"],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1]["temperature"].values);
    assert.isAbove(content.data[1]["temperature"].values.length, 0);
    assert.property(content.data[1]["temperature"].values[0], "last");
  });

  it("GET /sensors/data returns sensor data with multiple aggregates", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        aggregates: ["min", "max", "avg", "count"],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[2]["temperature"].values);
    assert.isAbove(content.data[2]["temperature"].values.length, 0);
    assert.property(content.data[2]["temperature"].values[0], "min");
    assert.property(content.data[2]["temperature"].values[0], "max");
    assert.property(content.data[2]["temperature"].values[0], "avg");
    assert.property(content.data[2]["temperature"].values[0], "count");
  });
});

describe("DataQuery API - Sensor Downsample, Filters & Edge Cases", function () {
  this.timeout(10000);

  it("GET /sensors/data with downsample 5m returns downsampled results", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        downsample: "5m",
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T06:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1]["temperature"].values);
    assert.isAbove(content.data[1]["temperature"].values.length, 0);
    assert.property(content.data[1]["temperature"].values[0], "time");
    assert.isAtMost(content.data[1]["temperature"].values.length, 20);
  });

  it("GET /sensors/data with downsample 1h returns downsampled results", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        downsample: "1h",
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T06:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[2]["temperature"].values);
    assert.isAbove(content.data[2]["temperature"].values.length, 0);
    assert.isBelow(content.data[2]["temperature"].values.length, 8);
  });

  it("GET /sensors/data with downsample 1h and aggregates returns both", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["moisture"],
        downsample: "1h",
        ids: [3],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[3]["moisture"].values);
    assert.isAbove(content.data[3]["moisture"].values.length, 0);
    assert.isAtMost(content.data[3]["moisture"].values.length, 25);
  });

  it("GET /sensors/data with downsample 1d returns downsampled results", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        downsample: "1d",
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-03T23:59:59.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1]["temperature"].values);
    assert.isAbove(content.data[1]["temperature"].values.length, 0);
    assert.isAtMost(content.data[1]["temperature"].values.length, 3);
  });

  it("GET /sensors/data with downsample and aggregates returns both", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["voltage"],
        downsample: "5m",
        aggregates: ["min", "max", "avg"],
        ids: [4],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T03:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[4]["voltage"].values);
    assert.isAbove(content.data[4]["voltage"].values.length, 0);
    assert.property(content.data[4]["voltage"].values[0], "min");
    assert.property(content.data[4]["voltage"].values[0], "max");
    assert.property(content.data[4]["voltage"].values[0], "avg");
    assert.isBelow(content.data[4]["voltage"].values.length, 18);
  });

  it("GET /sensors/data with timeRange filter returns filtered results", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        timeRange: {
          start: "2024-01-01T12:00:00.000Z",
          end: "2024-01-01T13:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1]["temperature"].values);
    assert.isAbove(content.data[1]["temperature"].values.length, 0);
    assert.isAtMost(content.data[1]["temperature"].values.length, 4);
    for (const value of content.data[1]["temperature"].values) {
      const valueTime = new Date(value.time).getTime();
      const rangeStart = new Date("2024-01-01T12:00:00.000Z").getTime();
      const rangeEnd = new Date("2024-01-01T13:00:00.000Z").getTime();
      assert.isAtLeast(valueTime, rangeStart);
      assert.isAtMost(valueTime, rangeEnd);
    }
  });

  it("GET /sensors/data with an unknown reading type returns an empty result", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["nonexistent_type"],
      })
      .expect(200);

    const content = response.body["content"];
    assert.deepEqual(content.data, {});
  });

  it("GET /sensors/data with empty readingTypes behaves like no filter", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: [],
      })
      .expect(200);

    const content = response.body["content"];
    assert.property(content.data[1], "temperature");
    assert.property(content.data[1], "humidity");
  });

  it("GET /sensors/data with no readingTypes returns all seeded metrics", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.property(content.data[1], "temperature");
    assert.property(content.data[1], "humidity");
    assert.property(content.data[1], "pressure");
  });

  it("GET /sensors/data with limit exceeding max returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["temperature"],
        limit: 10001,
      })
      .expect(400);

    const error = response.body["error"];
    assert.exists(error);
  });

  it("GET /sensors/data does not return nextCursor when all results fit in limit", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
        readingTypes: ["temperature"],
        ids: [2],
        limit: 100,
      })
      .expect(200);

    assert.notProperty(response.body.content, "nextCursor");
  });

  it("GET /sensors/data returns 400 for invalid percentile", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        readingTypes: ["temperature"],
        percentile: -0.1,
      })
      .expect(400);

    assert.exists(response.body["error"]);
  });

  it("GET /sensors/data with empty time range returns error", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        timeRange: {
          start: null,
          end: null,
        },
      })
      .expect(400);

    const error = response.body["error"];
    assert.exists(error);
  });

  it("GET /sensors/data with no time range returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["moisture"],
      })
      .expect(400);

    const error = response.body["error"];
    assert.exists(error);
  });

  it("GET /sensors/data with downsample 5m and aggregates returns correct bucket count", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["voltage"],
        downsample: "5m",
        aggregates: ["count"],
        ids: [4],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[4]["voltage"].values);
    assert.isAbove(content.data[4]["voltage"].values.length, 0);
    assert.isAtMost(content.data[4]["voltage"].values.length, 12);
    assert.property(content.data[4]["voltage"].values[0], "count");
  });

  it("GET /sensors/data with downsample 1h and multiple reading types", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature", "humidity"],
        downsample: "1h",
        aggregates: ["avg"],
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T06:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1]["temperature"].values);
    assert.isArray(content.data[2]["temperature"].values);
    assert.isBelow(content.data[1]["temperature"].values.length, 8);
    assert.isBelow(content.data[2]["temperature"].values.length, 8);
    assert.property(content.data[1]["temperature"].values[0], "avg");
    assert.property(content.data[2]["temperature"].values[0], "avg");
  });

  it("GET /sensors/data cursor pagination works with downsample", async () => {
    const firstResponse = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        downsample: "5m",
        limit: 5,
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T06:00:00.000Z",
        },
      })
      .expect(200);

    const firstContent = firstResponse.body["content"];
    const nextCursor = firstContent.nextCursor as string;
    const lastTimeFirstPage =
      firstContent.data[1]["temperature"].values[
        firstContent.data[1]["temperature"].values.length - 1
      ].time;

    const secondResponse = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        downsample: "5m",
        limit: 5,
        cursor: nextCursor,
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T06:00:00.000Z",
        },
      })
      .expect(200);

    const secondContent = secondResponse.body["content"];
    assert.isArray(secondContent.data[1]["temperature"].values);
    assert.isAbove(secondContent.data[1]["temperature"].values.length, 0);
    assert.isAtLeast(
      new Date(secondContent.data[1]["temperature"].values[0].time).getTime(),
      new Date(lastTimeFirstPage).getTime(),
    );
  });

  describe("arbitrary downsample intervals (raw path)", () => {
    it("GET /sensors/data with downsample 1m returns raw-path results", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          readingTypes: ["temperature"],
          downsample: "1m",
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T01:00:00.000Z",
          },
        })
        .expect(200);

      const content = response.body["content"];
      assert.isArray(content.data[1]["temperature"].values);
      assert.isAbove(content.data[1]["temperature"].values.length, 0);
      assert.property(content.data[1]["temperature"].values[0], "time");
    });

    it("GET /sensors/data with downsample 15 minutes returns raw-path results", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          readingTypes: ["temperature"],
          downsample: "15 minutes",
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T06:00:00.000Z",
          },
        })
        .expect(200);

      const content = response.body["content"];
      assert.isArray(content.data[1]["temperature"].values);
      assert.isAbove(content.data[1]["temperature"].values.length, 0);
      assert.isBelow(content.data[1]["temperature"].values.length, 25);
    });

    it("GET /sensors/data with downsample 4 hours returns raw-path results", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          readingTypes: ["temperature"],
          downsample: "4 hours",
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T06:00:00.000Z",
          },
        })
        .expect(200);

      const content = response.body["content"];
      assert.isArray(content.data[1]["temperature"].values);
      assert.isAbove(content.data[1]["temperature"].values.length, 0);
      assert.isAtMost(content.data[1]["temperature"].values.length, 2);
    });

    it("GET /sensors/data with raw-path downsample and percentile returns percentile data", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          readingTypes: ["moisture"],
          downsample: "15 minutes",
          aggregates: ["percentile"],
          percentile: 0.9,
          ids: [3],
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T06:00:00.000Z",
          },
        })
        .expect(200);

      const content = response.body["content"];
      assert.isArray(content.data[3]["moisture"].values);
      assert.isAbove(content.data[3]["moisture"].values.length, 0);
      assert.property(content.data[3]["moisture"].values[0], "percentile");
    });

    it("GET /sensors/data with raw-path downsample and all aggregates returns all fields", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          readingTypes: ["voltage"],
          downsample: "1m",
          aggregates: [
            "min",
            "max",
            "avg",
            "count",
            "sum",
            "stddev",
            "percentile",
            "first",
            "last",
          ],
          percentile: 0.5,
          ids: [4],
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T01:00:00.000Z",
          },
        })
        .expect(200);

      const content = response.body["content"];
      const value = content.data[4]["voltage"].values[0];
      assert.property(value, "min");
      assert.property(value, "max");
      assert.property(value, "avg");
      assert.property(value, "count");
      assert.property(value, "sum");
      assert.property(value, "stddev");
      assert.property(value, "percentile");
      assert.property(value, "first");
      assert.property(value, "last");
    });

    it("GET /sensors/data cursor pagination works with raw-path downsample", async () => {
      const firstResponse = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          readingTypes: ["temperature"],
          downsample: "15 minutes",
          limit: 5,
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T06:00:00.000Z",
          },
        })
        .expect(200);

      const firstContent = firstResponse.body["content"];
      const nextCursor = firstContent.nextCursor as string;
      const lastTimeFirstPage =
        firstContent.data[1]["temperature"].values[
          firstContent.data[1]["temperature"].values.length - 1
        ].time;

      const secondResponse = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          readingTypes: ["temperature"],
          downsample: "15 minutes",
          limit: 5,
          cursor: nextCursor,
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T06:00:00.000Z",
          },
        })
        .expect(200);

      const secondContent = secondResponse.body["content"];
      assert.isArray(secondContent.data[1]["temperature"].values);
      assert.isAbove(secondContent.data[1]["temperature"].values.length, 0);
      assert.isAtLeast(
        new Date(secondContent.data[1]["temperature"].values[0].time).getTime(),
        new Date(lastTimeFirstPage).getTime(),
      );
    });
  });
});

describe("DataQuery API - Output Data Query", function () {
  this.timeout(10000);

  it("GET /outputs/data returns default aggregate fields", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
      })
      .expect(200);

    const value = response.body["content"].data[1].values[0];
    assert.property(value, "time");
    assert.property(value, "avg");
    assert.property(value, "min");
    assert.property(value, "max");
  });

  it("GET /outputs/data returns paginated output data", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        limit: 5,
      })
      .expect(200);

    const content = response.body["content"];
    assert.isObject(content.data);
    assert.exists(content.data[1]);
    assert.isArray(content.data[1].values);
    assert.isAbove(content.data[1].values.length, 0);
    assert.property(content.data[1].values[0], "time");
    assert.exists(content.nextCursor);
    assert.isString(content.nextCursor);
  });

  it("GET /outputs/data respects limit parameter", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        limit: 3,
      })
      .expect(200);

    const content = response.body["content"];
    assert.isAtLeast(content.data[1].values.length, 1);
    assert.exists(content.nextCursor);
  });

  it("GET /outputs/data with valid cursor returns next page", async () => {
    const firstResponse = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        limit: 5,
      })
      .expect(200);

    const firstContent = firstResponse.body["content"];
    const nextCursor = firstContent.nextCursor as string;
    const lastTimeFirstPage =
      firstContent.data[1].values[firstContent.data[1].values.length - 1].time;

    const secondResponse = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        limit: 5,
        cursor: nextCursor,
      })
      .expect(200);

    const secondContent = secondResponse.body["content"];
    assert.isArray(secondContent.data[1].values);
    assert.isAbove(secondContent.data[1].values.length, 0);
    assert.isAbove(
      new Date(secondContent.data[1].values[0].time).getTime(),
      new Date(lastTimeFirstPage).getTime(),
    );
  });

  it("GET /outputs/data with invalid cursor returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        cursor: "invalidcursor!!!",
      })
      .expect(400);

    const error = response.body["error"];
    assert.exists(error);
  });

  it("GET /outputs/data with min aggregate returns aggregate data", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
        aggregates: ["min"],
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1].values);
    assert.isAbove(content.data[1].values.length, 0);
    for (const value of content.data[1].values) {
      assert.property(value, "min");
    }
  });

  it("GET /outputs/data with max aggregate returns aggregate data", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
        aggregates: ["max"],
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1].values);
    assert.isAbove(content.data[1].values.length, 0);
    for (const value of content.data[1].values) {
      assert.property(value, "max");
    }
  });

  it("GET /outputs/data with custom aggregates omits avg", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        aggregates: ["min", "max", "count"],
      })
      .expect(200);

    const value = response.body["content"].data[1].values[0];
    assert.property(value, "min");
    assert.property(value, "max");
    assert.property(value, "count");
    assert.notProperty(value, "avg");
  });

  it("GET /outputs/data with downsample returns downsampled results", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        downsample: "1h",
      })
      .expect(200);

    assert.isArray(response.body["content"].data[1].values);
  });

  it("GET /outputs/data returns 400 for missing timeRange", async () => {
    const response = await request(server).post("/api/v2/outputs/data").send({}).expect(400);
    assert.exists(response.body["error"]);
  });

  describe("arbitrary downsample intervals (raw path)", () => {
    it("GET /outputs/data with downsample 1m returns raw-path results", async () => {
      const response = await request(server)
        .post("/api/v2/outputs/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          downsample: "1m",
        })
        .expect(200);

      const content = response.body["content"];
      assert.isArray(content.data[1].values);
      assert.isAbove(content.data[1].values.length, 0);
      assert.property(content.data[1].values[0], "time");
      assert.property(content.data[1].values[0], "avg");
      assert.property(content.data[1].values[0], "min");
      assert.property(content.data[1].values[0], "max");
    });

    it("GET /outputs/data with downsample 15 minutes returns raw-path results", async () => {
      const response = await request(server)
        .post("/api/v2/outputs/data")
        .send({
          downsample: "15 minutes",
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T06:00:00.000Z",
          },
        })
        .expect(200);

      const content = response.body["content"];
      assert.isArray(content.data[1].values);
      assert.isAbove(content.data[1].values.length, 0);
      assert.isBelow(content.data[1].values.length, 25);
    });

    it("GET /outputs/data with raw-path downsample and all aggregates returns all fields", async () => {
      const response = await request(server)
        .post("/api/v2/outputs/data")
        .send({
          downsample: "1m",
          ids: [1],
          aggregates: ["avg", "count", "sum", "stddev", "percentile", "first", "last"],
          percentile: 0.95,
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T02:00:00.000Z",
          },
        })
        .expect(200);

      const value = response.body["content"].data[1].values[0];
      assert.property(value, "avg");
      assert.property(value, "count");
      assert.property(value, "sum");
      assert.property(value, "stddev");
      assert.property(value, "percentile");
      assert.property(value, "first");
      assert.property(value, "last");
    });

    it("GET /outputs/data cursor pagination works with raw-path downsample", async () => {
      const firstResponse = await request(server)
        .post("/api/v2/outputs/data")
        .send({
          downsample: "15 minutes",
          ids: [1],
          limit: 5,
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T06:00:00.000Z",
          },
        })
        .expect(200);

      const firstContent = firstResponse.body["content"];
      const nextCursor = firstContent.nextCursor as string;
      const lastTimeFirstPage =
        firstContent.data[1].values[firstContent.data[1].values.length - 1].time;

      const secondResponse = await request(server)
        .post("/api/v2/outputs/data")
        .send({
          downsample: "15 minutes",
          ids: [1],
          limit: 5,
          cursor: nextCursor,
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-01T06:00:00.000Z",
          },
        })
        .expect(200);

      const secondContent = secondResponse.body["content"];
      assert.isArray(secondContent.data[1].values);
      assert.isAbove(secondContent.data[1].values.length, 0);
      assert.isAtLeast(
        new Date(secondContent.data[1].values[0].time).getTime(),
        new Date(lastTimeFirstPage).getTime(),
      );
    });
  });

  it("GET /outputs/data filters by specific ids", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        ids: [5],
      })
      .expect(200);

    const content = response.body["content"];
    assert.property(content.data, "5");
    assert.notProperty(content.data, "1");
  });

  it("GET /outputs/data with timeRange filter returns filtered results", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T12:00:00.000Z",
          end: "2024-01-01T13:00:00.000Z",
        },
      })
      .expect(200);

    const content = response.body["content"];
    assert.isArray(content.data[1].values);
    assert.isAbove(content.data[1].values.length, 0);
    assert.isAtMost(content.data[1].values.length, 4);
  });

  it("GET /outputs/data with bad cursor returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        cursor: "bad_cursor",
      })
      .expect(400);

    const error = response.body["error"];
    assert.exists(error);
  });

  it("GET /outputs/data with empty time range returns error", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: null,
          end: null,
        },
      })
      .expect(400);

    const error = response.body["error"];
    assert.exists(error);
  });

  it("GET /outputs/data does not return nextCursor when all results fit in limit", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
        ids: [5],
        limit: 100,
      })
      .expect(200);

    assert.notProperty(response.body.content, "nextCursor");
  });

  it("GET /outputs/data returns 400 when limit exceeds max", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        limit: 10001,
      })
      .expect(400);

    assert.exists(response.body["error"]);
  });

  it("GET /outputs/data returns output data with extended aggregates", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-01T01:00:00.000Z",
        },
        ids: [1],
        aggregates: ["avg", "count", "sum", "stddev", "percentile", "first", "last"],
        percentile: 0.95,
      })
      .expect(200);

    const value = response.body["content"].data[1].values[0];
    assert.property(value, "avg");
    assert.property(value, "count");
    assert.property(value, "sum");
    assert.property(value, "stddev");
    assert.property(value, "percentile");
    assert.property(value, "first");
    assert.property(value, "last");
  });

  it("GET /outputs/data cursor pagination works with downsample", async () => {
    const firstResponse = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        downsample: "1h",
        ids: [1],
        limit: 5,
      })
      .expect(200);

    const firstContent = firstResponse.body["content"];
    const nextCursor = firstContent.nextCursor as string;
    const lastTimeFirstPage =
      firstContent.data[1].values[firstContent.data[1].values.length - 1].time;

    const secondResponse = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        downsample: "1h",
        ids: [1],
        limit: 5,
        cursor: nextCursor,
      })
      .expect(200);

    const secondContent = secondResponse.body["content"];
    assert.isArray(secondContent.data[1].values);
    assert.isAbove(secondContent.data[1].values.length, 0);
    assert.isAtLeast(
      new Date(secondContent.data[1].values[0].time).getTime(),
      new Date(lastTimeFirstPage).getTime(),
    );
  });

  it("GET /outputs/data returns 400 for invalid percentile", async () => {
    const response = await request(server)
      .post("/api/v2/outputs/data")
      .send({
        timeRange: {
          start: "2024-01-01T00:00:00.000Z",
          end: "2024-01-02T00:00:00.000Z",
        },
        percentile: 2,
      })
      .expect(400);

    assert.exists(response.body["error"]);
  });
});

describe("DataQuery API - Sensor Reading Type Verification", function () {
  this.timeout(10000);

  describe("BME280 sensor (id 1) returns only its supported reading types", () => {
    it("querying temperature does not return humidity or pressure", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          readingTypes: ["temperature"],
        })
        .expect(200);

      const content = response.body["content"];
      assert.property(content.data["1"], "temperature");
      assert.notProperty(content.data["1"], "humidity");
      assert.notProperty(content.data["1"], "pressure");
    });

    it("querying humidity does not return temperature or pressure", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          readingTypes: ["humidity"],
        })
        .expect(200);

      const content = response.body["content"];
      assert.property(content.data["1"], "humidity");
      assert.notProperty(content.data["1"], "temperature");
      assert.notProperty(content.data["1"], "pressure");
    });

    it("querying pressure does not return temperature or humidity", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          readingTypes: ["pressure"],
          ids: [1],
        })
        .expect(200);

      const content = response.body["content"];
      assert.property(content.data["1"], "pressure");
      assert.notProperty(content.data["1"], "temperature");
      assert.notProperty(content.data["1"], "humidity");
    });
  });

  describe("DS18B20 sensor (id 2) returns only temperature", () => {
    it("querying temperature returns data for sensor 2", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          readingTypes: ["temperature"],
        })
        .expect(200);

      const content = response.body["content"];
      assert.property(content.data["2"], "temperature");
      assert.isAbove(content.data["2"]["temperature"].values.length, 0);
    });
  });

  describe("CapacitiveMoistureSensor (id 3) returns only moisture", () => {
    it("querying moisture returns data for sensor 3", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          readingTypes: ["moisture"],
          ids: [3],
        })
        .expect(200);

      const content = response.body["content"];
      assert.property(content.data["3"], "moisture");
      assert.isAbove(content.data["3"]["moisture"].values.length, 0);
    });
  });

  describe("ADS1115 sensor (id 4) returns only voltage", () => {
    it("querying voltage returns data for sensor 4", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          readingTypes: ["voltage"],
          ids: [4],
        })
        .expect(200);

      const content = response.body["content"];
      assert.property(content.data["4"], "voltage");
      assert.isAbove(content.data["4"]["voltage"].values.length, 0);
    });
  });
});
