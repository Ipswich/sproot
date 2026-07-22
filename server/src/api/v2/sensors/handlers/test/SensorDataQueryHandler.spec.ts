import { sensorDataQueryHandlerAsync } from "../SensorDataQueryHandler";
import { SprootDB } from "../../../../../database/SprootDB";
import { assert } from "chai";
import sinon from "sinon";
import type { Request, Response } from "express";

function createMockResponse(): Response {
  const res = {} as Response;
  res.locals = { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } };
  res.status = sinon.stub().returnsThis() as any;
  res.json = sinon.stub().returnsThis() as any;
  return res;
}

describe("SensorDataQueryHandler", () => {
  it("should return 400 for invalid request body", async () => {
    const req = {
      params: "not an object",
      app: { get: sinon.stub().returns({} as SprootDB) },
      originalUrl: "/api/v2/sensors/data/1",
    } as unknown as Request;
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 400);
    assert.equal((result as any).error.name, "Validation Error");
  });

  it("should return 400 for missing timeRange", async () => {
    const req = {
      params: { id: 1 },
      query: { downsample: "5m" },
      app: { get: sinon.stub().returns({} as SprootDB) },
      originalUrl: "/api/v2/sensors/data/1",
    } as unknown as Request;
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 400);
  });

  it("should return 200 with data when DB query succeeds", async () => {
    const mockDataQueries = {
      querySensorDataAsync: sinon.stub().resolves({
        data: {
          id: 1,
          name: "temperature",
          units: "°C",
          statistics: { avg: [22], min: [20], max: [30] },
        },
        xAxis: { field: "time", values: ["2024-01-01T00:00:00.000Z"] },
      }),
    };
    const mockDb = {
      dataQueries: mockDataQueries,
    } as unknown as SprootDB;

    const req = {
      params: { id: 1 },
      query: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      },
      app: { get: sinon.stub().returns(mockDb) },
      originalUrl: "/api/v2/sensors/data/1",
      locals: { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } },
    } as unknown as Request;
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 200);
    assert.isNotNull((result as any).content.data);
    assert.equal((result as any).content.data.id, 1);
  });

  it("should return 500 when DB query throws", async () => {
    const mockDataQueries = {
      querySensorDataAsync: sinon.stub().rejects(new Error("connection refused")),
    };
    const mockDb = {
      dataQueries: mockDataQueries,
    } as unknown as SprootDB;

    const req = {
      params: { id: 1 },
      query: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      },
      app: { get: sinon.stub().returns(mockDb) },
      originalUrl: "/api/v2/sensors/data/1",
      locals: { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } },
    } as unknown as Request;
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 500);
    assert.equal((result as any).error.name, "Internal server error");
  });

  it("should include nextCursor in response when present", async () => {
    const mockDataQueries = {
      querySensorDataAsync: sinon.stub().resolves({
        data: null,
        nextCursor: Buffer.from("2024-01-01T01:00:00.000Z").toString("base64"),
        xAxis: { field: "time", values: [] },
      }),
    };
    const mockDb = {
      dataQueries: mockDataQueries,
    } as unknown as SprootDB;

    const req = {
      params: { id: 1 },
      query: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      },
      app: { get: sinon.stub().returns(mockDb) },
      originalUrl: "/api/v2/sensors/data/1",
      locals: { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } },
    } as unknown as Request;
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 200);
    assert.property((result as any).content, "nextCursor");
  });
});
