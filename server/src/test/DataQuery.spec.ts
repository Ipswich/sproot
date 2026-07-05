import { expect } from "chai";
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
    expect(content.data).to.be.an("object");
    expect(content.data[1]).to.be.an("object");
    expect(content.data[1]["temperature"]).to.exist;
    expect(content.data[1]["temperature"].values).to.be.an("array");
    expect(content.data[1]["temperature"].values.length).to.be.greaterThan(0);
    if (content.nextCursor) {
      expect(content.nextCursor).to.be.a("string");
    }
    expect(content.data[1]["temperature"].values[0]).to.have.property("time");
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
    expect(content.data[2]["temperature"].values.length).to.equal(5);
    expect(content.nextCursor).to.exist;
    expect(content.nextCursor).to.be.a("string");
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
    expect(content.nextCursor).to.be.a("string");
    expect(content.nextCursor.length).to.be.greaterThan(0);
    expect(content.data[3]["moisture"].values.length).to.equal(10);
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
      firstContent.data[4]["voltage"].values[firstContent.data[4]["voltage"].values.length - 1].time;

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
    expect(secondContent.data[4]["voltage"].values).to.be.an("array");
    expect(secondContent.data[4]["voltage"].values.length).to.be.greaterThan(0);
    expect(new Date(secondContent.data[4]["voltage"].values[0].time).getTime()).to.be.greaterThan(new Date(lastTimeFirstPage).getTime());
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
    expect(error).to.exist;
    expect(error.details).to.be.an("array");
    expect(error.details[0].toLowerCase()).to.include("cursor");
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
    expect(content.data[1]["temperature"]).to.exist;
    expect(content.data[2]["temperature"]).to.exist;
    expect(content.data[3]["moisture"]).to.exist;
    expect(content.data[1]["temperature"].values).to.be.an("array");
    expect(content.data[2]["temperature"].values).to.be.an("array");
    expect(content.data[3]["moisture"].values).to.be.an("array");

    const totalValues =
      content.data[1]["temperature"].values.length +
      content.data[2]["temperature"].values.length +
      content.data[3]["moisture"].values.length;
    expect(totalValues).to.be.greaterThan(0);
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
    expect(content.data[1]["temperature"].values).to.be.an("array");
    expect(content.data[1]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[1]["temperature"].values[0]).to.have.property("min");
    expect(content.data[1]["temperature"].values[0].min).to.be.a("number");
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
    expect(content.data[2]["temperature"].values).to.be.an("array");
    expect(content.data[2]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[2]["temperature"].values[0]).to.have.property("max");
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
    expect(content.data[3]["moisture"].values).to.be.an("array");
    expect(content.data[3]["moisture"].values.length).to.be.greaterThan(0);
    expect(content.data[3]["moisture"].values[0]).to.have.property("avg");
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
    expect(content.data[4]["voltage"].values).to.be.an("array");
    expect(content.data[4]["voltage"].values.length).to.be.greaterThan(0);
    expect(content.data[4]["voltage"].values[0]).to.have.property("count");
    expect(content.data[4]["voltage"].values[0].count).to.be.a("number");
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
    expect(content.data[1]["temperature"].values).to.be.an("array");
    expect(content.data[1]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[1]["temperature"].values[0]).to.have.property("sum");
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
    expect(content.data[2]["temperature"].values).to.be.an("array");
    expect(content.data[2]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[2]["temperature"].values[0]).to.have.property("stddev");
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
    expect(content.data[3]["moisture"].values).to.be.an("array");
    expect(content.data[3]["moisture"].values.length).to.be.greaterThan(0);
    expect(content.data[3]["moisture"].values[0]).to.have.property("percentile");
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
    expect(content.data[4]["voltage"].values).to.be.an("array");
    expect(content.data[4]["voltage"].values.length).to.be.greaterThan(0);
    expect(content.data[4]["voltage"].values[0]).to.have.property("first");
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
    expect(content.data[1]["temperature"].values).to.be.an("array");
    expect(content.data[1]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[1]["temperature"].values[0]).to.have.property("last");
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
    expect(content.data[2]["temperature"].values).to.be.an("array");
    expect(content.data[2]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[2]["temperature"].values[0]).to.have.property("min");
    expect(content.data[2]["temperature"].values[0]).to.have.property("max");
    expect(content.data[2]["temperature"].values[0]).to.have.property("avg");
    expect(content.data[2]["temperature"].values[0]).to.have.property("count");
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
    expect(content.data[1]["temperature"].values).to.be.an("array");
    expect(content.data[1]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[1]["temperature"].values[0]).to.have.property("time");
    expect(content.data[1]["temperature"].values.length).to.be.lessThan(20);
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
    expect(content.data[2]["temperature"].values).to.be.an("array");
    expect(content.data[2]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[2]["temperature"].values.length).to.be.lessThan(8);
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
    expect(content.data[3]["moisture"].values).to.be.an("array");
    expect(content.data[3]["moisture"].values.length).to.be.greaterThan(0);
    expect(content.data[3]["moisture"].values.length).to.be.lessThanOrEqual(24);
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
    expect(content.data[1]["temperature"].values).to.be.an("array");
    expect(content.data[1]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[1]["temperature"].values.length).to.be.lessThanOrEqual(3);
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
    expect(content.data[4]["voltage"].values).to.be.an("array");
    expect(content.data[4]["voltage"].values.length).to.be.greaterThan(0);
    expect(content.data[4]["voltage"].values[0]).to.have.property("min");
    expect(content.data[4]["voltage"].values[0]).to.have.property("max");
    expect(content.data[4]["voltage"].values[0]).to.have.property("avg");
    expect(content.data[4]["voltage"].values.length).to.be.lessThan(18);
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
    expect(content.data[1]["temperature"].values).to.be.an("array");
    expect(content.data[1]["temperature"].values.length).to.be.greaterThan(0);
    expect(content.data[1]["temperature"].values.length).to.be.lessThanOrEqual(4);
    for (const value of content.data[1]["temperature"].values) {
      const valueTime = new Date(value.time).getTime();
      const rangeStart = new Date("2024-01-01T12:00:00.000Z").getTime();
      const rangeEnd = new Date("2024-01-01T13:00:00.000Z").getTime();
      expect(valueTime).to.be.greaterThanOrEqual(rangeStart);
      expect(valueTime).to.be.lessThanOrEqual(rangeEnd);
    }
  });

  it("GET /sensors/data with invalid reading type returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["nonexistent_type"],
      })
      .expect(400);

    const error = response.body["error"];
    expect(error).to.exist;
  });

  it("GET /sensors/data with empty reading types returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: [],
      })
      .expect(400);

    const error = response.body["error"];
    expect(error).to.exist;
  });

  it("GET /sensors/data with no reading types returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({})
      .expect(400);

    const error = response.body["error"];
    expect(error).to.exist;
  });

  it("GET /sensors/data with limit exceeding max returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["temperature"],
        limit: 10001,
      })
      .expect(400);

    const error = response.body["error"];
    expect(error).to.exist;
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
    expect(error).to.exist;
  });

  it("GET /sensors/data with no time range returns 400", async () => {
    const response = await request(server)
      .post("/api/v2/sensors/data")
      .send({
        readingTypes: ["moisture"],
      })
      .expect(400);

    const error = response.body["error"];
    expect(error).to.exist;
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
    expect(content.data[4]["voltage"].values).to.be.an("array");
    expect(content.data[4]["voltage"].values.length).to.be.greaterThan(0);
    expect(content.data[4]["voltage"].values.length).to.be.lessThanOrEqual(12);
    expect(content.data[4]["voltage"].values[0]).to.have.property("count");
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
    expect(content.data[1]["temperature"].values).to.be.an("array");
    expect(content.data[2]["temperature"].values).to.be.an("array");
    expect(content.data[1]["temperature"].values.length).to.be.lessThan(8);
    expect(content.data[2]["temperature"].values.length).to.be.lessThan(8);
    expect(content.data[1]["temperature"].values[0]).to.have.property("avg");
    expect(content.data[2]["temperature"].values[0]).to.have.property("avg");
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
      firstContent.data[1]["temperature"].values[firstContent.data[1]["temperature"].values.length - 1].time;

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
    expect(secondContent.data[1]["temperature"].values).to.be.an("array");
    expect(secondContent.data[1]["temperature"].values.length).to.be.greaterThan(0);
    expect(new Date(secondContent.data[1]["temperature"].values[0].time).getTime()).to.be.greaterThanOrEqual(new Date(lastTimeFirstPage).getTime());
  });
});

describe("DataQuery API - Output Data Query", function () {
  this.timeout(10000);

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
    expect(content.data).to.be.an("object");
    expect(content.data[1]).to.exist;
    expect(content.data[1].values).to.be.an("array");
    expect(content.data[1].values.length).to.be.greaterThan(0);
    expect(content.data[1].values[0]).to.have.property("time");
    expect(content.nextCursor).to.exist;
    expect(content.nextCursor).to.be.a("string");
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
    expect(content.data[1].values.length).to.be.at.least(1);
    expect(content.nextCursor).to.exist;
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
    expect(secondContent.data[1].values).to.be.an("array");
    expect(secondContent.data[1].values.length).to.be.greaterThan(0);
    expect(new Date(secondContent.data[1].values[0].time).getTime()).to.be.greaterThan(new Date(lastTimeFirstPage).getTime());
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
    expect(error).to.exist;
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
    expect(content.data[1].values).to.be.an("array");
    expect(content.data[1].values.length).to.be.greaterThan(0);
    for (const value of content.data[1].values) {
      expect(value).to.have.property("min");
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
    expect(content.data[1].values).to.be.an("array");
    expect(content.data[1].values.length).to.be.greaterThan(0);
    for (const value of content.data[1].values) {
      expect(value).to.have.property("max");
    }
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
    expect(content.data[1].values).to.be.an("array");
    expect(content.data[1].values.length).to.be.greaterThan(0);
    expect(content.data[1].values.length).to.be.lessThanOrEqual(4);
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
    expect(error).to.exist;
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
    expect(error).to.exist;
  });
});

describe("DataQuery API - Migrated Tests", function () {
  this.timeout(10000);

  describe("POST /sensors/data", () => {
    it("Migrated: should return 200 and sensor data with default aggregates", async () => {
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
      expect(content.data).to.have.property("1");
      expect(content.data["1"]).to.have.property("temperature");
      expect(content.data["1"]["temperature"]).to.have.property("values");
      expect(Array.isArray(content.data["1"]["temperature"].values)).to.be.true;
      expect(content.data["1"]["temperature"].values[0]).to.have.property("time");
      expect(content.data["1"]["temperature"].values[0]).to.have.property("avg");
    });

    it("Migrated: should return 200 and sensor data with custom aggregates", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          aggregates: ["min", "max", "count"],
        })
        .expect(200);
      const content = response.body["content"];
      expect(content.data["1"]["temperature"].values[0]).to.have.property("min");
      expect(content.data["1"]["temperature"].values[0]).to.have.property("max");
      expect(content.data["1"]["temperature"].values[0]).to.have.property("count");
      expect(content.data["1"]["temperature"].values[0]).to.not.have.property("avg");
    });

    it("Migrated: should return 200 and sensor data with downsample", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          downsample: "1h",
        })
        .expect(200);
      const content = response.body["content"];
      expect(content.data).to.have.property("1");
      expect(Array.isArray(content.data["1"]["temperature"].values)).to.be.true;
    });

    it("Migrated: should return 400 for missing timeRange", async () => {
      await request(server).post("/api/v2/sensors/data").send({}).expect(400);
    });

    it("Migrated: should return 400 for invalid downsample", async () => {
      await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          downsample: "invalid",
        })
        .expect(400);
    });

    it("Migrated: should return 200 and filter sensor data by readingTypes", async () => {
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
      expect(content.data["3"]).to.have.property("moisture");
      expect(content.data["3"]["moisture"].values.length).to.be.greaterThan(0);
    });

    it("Migrated: should return nextCursor when limit is small", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          limit: 1,
        })
        .expect(200);
      expect(response.body.content.nextCursor).to.be.a("string");
      const decoded = Buffer.from(response.body.content.nextCursor, "base64").toString();
      expect(decoded).to.match(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("Migrated: should not return nextCursor when all results fit in limit", async () => {
      const response = await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          limit: 100,
        })
        .expect(200);
      expect(response.body.content).to.have.property("nextCursor");
    });

    it("Migrated: should return 400 for invalid aggregates", async () => {
      await request(server)
        .post("/api/v2/sensors/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          aggregates: ["invalid"],
        })
        .expect(400);
    });
  });

  describe("POST /outputs/data", () => {
    it("Migrated: should return 200 and output data with default aggregates", async () => {
      const response = await request(server)
        .post("/api/v2/outputs/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
        })
        .expect(200);
      const content = response.body["content"];
      expect(content.data).to.have.property("1");
      expect(content.data["1"]).to.have.property("values");
      expect(Array.isArray(content.data["1"].values)).to.be.true;
      expect(content.data["1"].values[0]).to.have.property("time");
      expect(content.data["1"].values[0]).to.have.property("avg");
    });

    it("Migrated: should return 200 and output data with custom aggregates", async () => {
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
      const content = response.body["content"];
      expect(content.data["1"].values[0]).to.have.property("min");
      expect(content.data["1"].values[0]).to.have.property("max");
      expect(content.data["1"].values[0]).to.have.property("count");
      expect(content.data["1"].values[0]).to.not.have.property("avg");
    });

    it("Migrated: should return 200 and output data with downsample", async () => {
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
      const content = response.body["content"];
      expect(content.data).to.have.property("1");
      expect(Array.isArray(content.data["1"].values)).to.be.true;
    });

    it("Migrated: should return 400 for missing timeRange", async () => {
      await request(server).post("/api/v2/outputs/data").send({}).expect(400);
    });

    it("Migrated: should return 400 for invalid downsample", async () => {
      await request(server)
        .post("/api/v2/outputs/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          downsample: "1m",
        })
        .expect(400);
    });

    it("Migrated: should return nextCursor when limit is small", async () => {
      const response = await request(server)
        .post("/api/v2/outputs/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          limit: 1,
        })
        .expect(200);
      expect(response.body.content.nextCursor).to.be.a("string");
      const decoded = Buffer.from(response.body.content.nextCursor, "base64").toString();
      expect(decoded).to.match(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("Migrated: should return 400 for invalid aggregates", async () => {
      await request(server)
        .post("/api/v2/outputs/data")
        .send({
          timeRange: {
            start: "2024-01-01T00:00:00.000Z",
            end: "2024-01-02T00:00:00.000Z",
          },
          aggregates: ["invalid"],
        })
        .expect(400);
    });

    describe("DataQuery API - Reading Type Verification", function () {
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
          expect(content.data["1"]).to.have.property("temperature");
          expect(content.data["1"]).to.not.have.property("humidity");
          expect(content.data["1"]).to.not.have.property("pressure");
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
          expect(content.data["1"]).to.have.property("humidity");
          expect(content.data["1"]).to.not.have.property("temperature");
          expect(content.data["1"]).to.not.have.property("pressure");
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
          expect(content.data["1"]).to.have.property("pressure");
          expect(content.data["1"]).to.not.have.property("temperature");
          expect(content.data["1"]).to.not.have.property("humidity");
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
          expect(content.data["2"]).to.have.property("temperature");
          expect(content.data["2"]["temperature"].values.length).to.be.greaterThan(0);
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
          expect(content.data["3"]).to.have.property("moisture");
          expect(content.data["3"]["moisture"].values.length).to.be.greaterThan(0);
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
          expect(content.data["4"]).to.have.property("voltage");
          expect(content.data["4"]["voltage"].values.length).to.be.greaterThan(0);
        });
      });
    });
  });
});
