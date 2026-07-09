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

function createMockRequest(body: unknown): Request {
  return {
    body,
    app: { get: sinon.stub().returns({} as SprootDB) },
    originalUrl: "/api/v2/sensors/data",
  } as unknown as Request;
}

describe("SensorDataQueryHandler", () => {
  it("should return 400 for invalid request body", async () => {
    const req = createMockRequest("not an object");
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 400);
    assert.equal((result as any).error.name, "Validation Error");
  });

  it("should return 400 for missing timeRange", async () => {
    const req = createMockRequest({ downsample: "5m" });
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 400);
  });

  it("should return 200 with data when DB query succeeds", async () => {
    const mockDb = {
      querySensorDataAsync: sinon.stub().resolves({
        data: [
          {
            id: 1,
            name: "temperature",
            units: "°C",
            statistics: { avg: [22], min: [20], max: [30] },
          },
        ],
        xAxis: { field: "time", values: ["2024-01-01T00:00:00.000Z"] },
      }),
    } as unknown as SprootDB;

    const req = {
      body: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      },
      app: { get: sinon.stub().returns(mockDb) },
      originalUrl: "/api/v2/sensors/data",
      locals: { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } },
    } as unknown as Request;
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 200);
    assert.isTrue((result as any).content.data.some((d: any) => d.id === 1));
  });

  it("should return 500 when DB query throws", async () => {
    const mockDb = {
      querySensorDataAsync: sinon.stub().rejects(new Error("connection refused")),
    } as unknown as SprootDB;

    const req = {
      body: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      },
      app: { get: sinon.stub().returns(mockDb) },
      originalUrl: "/api/v2/sensors/data",
      locals: { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } },
    } as unknown as Request;
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 500);
    assert.equal((result as any).error.name, "Internal server error");
  });

  it("should include nextCursor in response when present", async () => {
    const mockDb = {
      querySensorDataAsync: sinon.stub().resolves({
        data: [],
        nextCursor: Buffer.from("2024-01-01T01:00:00.000Z").toString("base64"),
      }),
    } as unknown as SprootDB;

    const req = {
      body: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      },
      app: { get: sinon.stub().returns(mockDb) },
      originalUrl: "/api/v2/sensors/data",
      locals: { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } },
    } as unknown as Request;
    const res = createMockResponse();
    const result = await sensorDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 200);
    assert.property((result as any).content, "nextCursor");
  });
});
