import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

interface DataQueryHandlerTestConfig<RequestType, ResponseType> {
  handlerName: string;
  url: string;
  handler: (req: Request, res: Response) => Promise<SuccessResponse | ErrorResponse>;
  entityType: "sensor" | "output";
  validBody: Partial<RequestType>;
  responseData: ResponseType;
  extraValidationTests?: Array<{
    name: string;
    body: Partial<RequestType>;
    errorName?: string;
  }>;
}

export function testDataQueryHandlerTests<RequestType, ResponseType>(
  config: DataQueryHandlerTestConfig<RequestType, ResponseType>,
) {
  describe(`${config.handlerName} tests`, () => {
    let mockResponse: Response;
    let sprootDBStub: MockSprootDB;

    function getQueryStub(): sinon.SinonStub {
      if (config.entityType === "sensor") {
        return (sprootDBStub as any).sensors.getDataAsync;
      }
      return (sprootDBStub as any).outputs.getDataAsync;
    }

    beforeEach(() => {
      sprootDBStub = new MockSprootDB();
      const sensorStub = sinon.stub();
      const outputStub = sinon.stub();
      Object.defineProperty(sprootDBStub, "sensors", {
        value: { getDataAsync: sensorStub },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(sprootDBStub, "outputs", {
        value: { getDataAsync: outputStub },
        writable: true,
        configurable: true,
      });
      mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "test-req-123",
          },
        },
      } as unknown as Response;
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 with data", async () => {
      getQueryStub().resolves(config.responseData as any);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: { ...config.validBody },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.deepEqual(result.content?.data, (config.responseData as any).data);
      assert.equal(result.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(getQueryStub().calledOnce);
    });

    it("should return nextCursor in response when present", async () => {
      const responseDataWithCursor = {
        ...config.responseData,
        nextCursor: "test-cursor-value",
      } as ResponseType;

      getQueryStub().resolves(responseDataWithCursor as any);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: { ...config.validBody },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.equal(result.content?.nextCursor, "test-cursor-value");
    });

    it("should return 400 when validation fails — missing timeRange", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: {},
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.equal(result.error.url, config.url);
      assert.isArray(result.error.details);
      assert.isTrue(result.error.details.length > 0);
      assert.isFalse(getQueryStub().called);
    });

    it("should return 400 when validation fails — invalid timeRange", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: {
          timeRange: { start: "not-a-date", end: "2024-01-01T01:00:00.000Z" },
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(getQueryStub().called);
    });

    it("should return 400 when validation fails — invalid limit", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: {
          timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
          limit: 0,
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(getQueryStub().called);
    });

    it("should return 400 when validation fails — invalid id", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: "not-a-number" },
        query: {
          timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(getQueryStub().called);
    });

    it("should return 400 when validation fails — invalid aggregates", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: {
          timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
          aggregates: ["invalid_agg"],
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(getQueryStub().called);
    });

    it("should return 400 when validation fails — invalid cursor", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: {
          timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
          cursor: 12345,
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(getQueryStub().called);
    });

    it("should sanitize error details — never expose SQL queries or internal messages", async () => {
      const sqlError = new Error(
        'relation "readings" does not exist\nLINE 1: SELECT * FROM readings WHERE ...',
      );
      getQueryStub().rejects(sqlError);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: { ...config.validBody },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 500);
      assert.equal(result.error.name, "Internal server error");
      assert.equal(result.error.url, config.url);
      assert.isArray(result.error.details);
      const detail = result.error.details[0] as string;
      assert.notInclude(detail.toLowerCase(), "sql");
      assert.notInclude(detail.toLowerCase(), "select");
      assert.notInclude(detail.toLowerCase(), "relation");
      assert.notInclude(detail.toLowerCase(), "readings");
    });

    it("should return 500 when SprootDB throws", async () => {
      getQueryStub().rejects(new Error("Database connection failed"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: { ...config.validBody },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 500);
      assert.equal(result.error.name, "Internal server error");
      assert.equal(result.error.url, config.url);
      assert.isArray(result.error.details);
      const detail = result.error.details[0] as string;
      assert.notInclude(detail.toLowerCase(), "database connection failed");
    });

    it("should return 500 with generic message for non-Error exceptions", async () => {
      getQueryStub().callsFake(async () => {
        throw 42;
      });

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: { ...config.validBody },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 500);
      assert.equal(result.error.details[0], "Internal server error");
    });

    it("should pass through all request params to SprootDB", async () => {
      getQueryStub().resolves(config.responseData as any);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 2 },
        query: {
          ...config.validBody,
          downsample: "1h",
          aggregates: ["avg", "max"],
          limit: 100,
          cursor: Buffer.from("2024-01-01T00:30:00.000Z").toString("base64"),
        },
      } as unknown as Request;

      await config.handler(mockRequest, mockResponse);

      const callArg = getQueryStub().getCall(0).args[0];
      assert.equal(callArg.downsample, "1h");
      assert.equal(callArg.id, 2);
      assert.deepEqual(callArg.aggregates, ["avg", "max"]);
      assert.equal(callArg.limit, 100);
      assert.isDefined(callArg.cursor);
    });

    it("should handle empty data response", async () => {
      const emptyResponse = {
        data: {},
      } as ResponseType;

      getQueryStub().resolves(emptyResponse as any);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        params: { id: 1 },
        query: { ...config.validBody },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.deepEqual(result.content?.data, (emptyResponse as any).data);
    });

    if (config.extraValidationTests) {
      for (const test of config.extraValidationTests) {
        it(`should return 400 when validation fails — ${test.name}`, async () => {
          const mockRequest = {
            app: {
              get: (key: string) => {
                if (key === "sprootDB") return sprootDBStub;
                return undefined;
              },
            },
            originalUrl: config.url,
            params: { id: 1 },
            query: test.body,
          } as unknown as Request;

          const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

          assert.equal(result.statusCode, 400);
          assert.equal(result.error.name, test.errorName ?? "Validation Error");
          assert.isFalse(getQueryStub().called);
        });
      }
    }
  });
}
