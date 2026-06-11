import { outputDataQueryHandlerAsync } from "../OutputDataQueryHandler";
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
    originalUrl: "/api/v2/outputs/data",
  } as unknown as Request;
}

describe("OutputDataQueryHandler", () => {
  it("should return 400 for invalid request body", async () => {
    const req = createMockRequest("not an object");
    const res = createMockResponse();
    const result = await outputDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 400);
    assert.equal((result as any).error.name, "Validation Error");
  });

  it("should return 400 for missing timeRange", async () => {
    const req = createMockRequest({});
    const res = createMockResponse();
    const result = await outputDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 400);
  });

  it("should return 400 for invalid downsample", async () => {
    const req = createMockRequest({
      timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      downsample: "1m",
    });
    const res = createMockResponse();
    const result = await outputDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 400);
  });

  it("should return 200 with data when DB query succeeds", async () => {
    const mockDb = {
      queryOutputDataAsync: sinon.stub().resolves({
        data: { 1: { values: [{ time: "2024-01-01T00:00:00.000Z", avg: 100 }] } },
      }),
    } as unknown as SprootDB;

    const req = {
      body: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      },
      app: { get: sinon.stub().returns(mockDb) },
      originalUrl: "/api/v2/outputs/data",
      locals: { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } },
    } as unknown as Request;
    const res = createMockResponse();
    const result = await outputDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 200);
    assert.property((result as any).content.data, "1");
  });

  it("should return 500 when DB query throws", async () => {
    const mockDb = {
      queryOutputDataAsync: sinon.stub().rejects(new Error("connection refused")),
    } as unknown as SprootDB;

    const req = {
      body: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      },
      app: { get: sinon.stub().returns(mockDb) },
      originalUrl: "/api/v2/outputs/data",
      locals: { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } },
    } as unknown as Request;
    const res = createMockResponse();
    const result = await outputDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 500);
  });

  it("should include nextCursor in response when present", async () => {
    const mockDb = {
      queryOutputDataAsync: sinon.stub().resolves({
        data: {},
        nextCursor: Buffer.from("2024-01-01T01:00:00.000Z").toString("base64"),
      }),
    } as unknown as SprootDB;

    const req = {
      body: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-02T00:00:00.000Z" },
      },
      app: { get: sinon.stub().returns(mockDb) },
      originalUrl: "/api/v2/outputs/data",
      locals: { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } },
    } as unknown as Request;
    const res = createMockResponse();
    const result = await outputDataQueryHandlerAsync(req, res);
    assert.equal(result.statusCode, 200);
    assert.property((result as any).content, "nextCursor");
  });
});
