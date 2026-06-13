import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { SprootDB } from "../../../../database/SprootDB";

interface DataQueryHandlerTestConfig<RequestType, ResponseType> {
  handlerName: string;
  url: string;
  handler: (req: Request, res: Response) => Promise<SuccessResponse | ErrorResponse>;
  queryMethod: keyof SprootDB;
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
    let sprootDBStub: sinon.SinonStubbedInstance<SprootDB>;

    beforeEach(() => {
      sprootDBStub = sinon.createStubInstance(SprootDB);
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
      sprootDBStub[config.queryMethod as keyof typeof sprootDBStub].resolves(
        config.responseData as any,
      );

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        body: config.validBody,
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.deepEqual(result.content?.data, (config.responseData as any).data);
      assert.equal(result.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(
        (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub)
          .calledOnce,
      );
    });

    it("should return nextCursor in response when present", async () => {
      const responseDataWithCursor = {
        ...config.responseData,
        nextCursor: "test-cursor-value",
      } as ResponseType;

      sprootDBStub[config.queryMethod as keyof typeof sprootDBStub].resolves(
        responseDataWithCursor as any,
      );

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        body: config.validBody,
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
        body: {},
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.equal(result.error.url, config.url);
      assert.isArray(result.error.details);
      assert.isTrue(result.error.details.length > 0);
      assert.isFalse(
        (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).called,
      );
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
        body: {
          timeRange: { start: "not-a-date", end: "2024-01-01T01:00:00.000Z" },
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(
        (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).called,
      );
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
        body: {
          timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
          limit: 0,
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(
        (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).called,
      );
    });

    it("should return 400 when validation fails — invalid ids", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        body: {
          timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
          ids: ["not-a-number"],
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(
        (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).called,
      );
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
        body: {
          timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
          aggregates: ["invalid_agg"],
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(
        (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).called,
      );
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
        body: {
          timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
          cursor: 12345,
        },
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error.name, "Validation Error");
      assert.isFalse(
        (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).called,
      );
    });

    it("should sanitize error details — never expose SQL queries or internal messages", async () => {
      const sqlError = new Error(
        'relation "readings" does not exist\nLINE 1: SELECT * FROM readings WHERE ...',
      );
      (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).rejects(
        sqlError,
      );

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        body: config.validBody,
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
      (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).rejects(
        new Error("Database connection failed"),
      );

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        body: config.validBody,
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
      (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).callsFake(
        async () => {
          throw 42;
        },
      );

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        body: config.validBody,
      } as unknown as Request;

      const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 500);
      assert.equal(result.error.details[0], "Internal server error");
    });

    it("should pass through all request params to SprootDB", async () => {
      (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).resolves(
        config.responseData as any,
      );

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        body: {
          ...config.validBody,
          downsample: "1h",
          ids: [2, 3],
          aggregates: ["avg", "max"],
          limit: 100,
          cursor: Buffer.from("2024-01-01T00:30:00.000Z").toString("base64"),
        },
      } as unknown as Request;

      await config.handler(mockRequest, mockResponse);

      const callArg = (
        sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub
      ).getCall(0).args[0];
      assert.equal(callArg.downsample, "1h");
      assert.deepEqual(callArg.ids, [2, 3]);
      assert.deepEqual(callArg.aggregates, ["avg", "max"]);
      assert.equal(callArg.limit, 100);
      assert.isDefined(callArg.cursor);
    });

    it("should handle empty data response", async () => {
      const emptyResponse = {
        data: {},
      } as ResponseType;

      (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub).resolves(
        emptyResponse as any,
      );

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") return sprootDBStub;
            return undefined;
          },
        },
        originalUrl: config.url,
        body: config.validBody,
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
            body: test.body,
          } as unknown as Request;

          const result = (await config.handler(mockRequest, mockResponse)) as ErrorResponse;

          assert.equal(result.statusCode, 400);
          assert.equal(result.error.name, test.errorName ?? "Validation Error");
          assert.isFalse(
            (sprootDBStub[config.queryMethod as keyof typeof sprootDBStub] as sinon.SinonStub)
              .called,
          );
        });
      }
    }
  });
}
