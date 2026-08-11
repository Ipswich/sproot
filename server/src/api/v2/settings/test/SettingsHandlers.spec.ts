import { describe, it, beforeEach, afterEach } from "mocha";
import { assert } from "chai";
import { createSandbox, SinonSandbox } from "sinon";
import { Request, Response } from "express";
import { getSettingsAsync, updateSettingsAsync } from "../handlers/SettingsHandlers";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { SettingsService } from "../../../../settings/SettingsService";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { SETTINGS } from "../../../../database/settings/SettingsSchema";

describe("SettingsHandlers", () => {
  let sandbox: SinonSandbox;
  let mockRequest: Request;
  let mockResponse: Response;
  let mockService: Partial<SettingsService>;

  beforeEach(() => {
    sandbox = createSandbox();

    mockService = {
      getAllAsync: sandbox.stub().resolves({
        [SETTINGS.sensors.data_retention]: "30 days",
        [SETTINGS.outputs.data_retention]: "60 days",
        [SETTINGS.system.backup_retention]: "30 days",
        [SETTINGS.system.latitude]: "40.7128",
        [SETTINGS.system.longitude]: "-74.0060",
      }),
      setAsync: sandbox.stub().resolves(),
    };

    mockRequest = {
      app: {
        get: ((key: string) => {
          if (key === DI_KEYS.SettingsService) return mockService;
          return undefined;
        }) as any,
      },
      originalUrl: "/api/v2/settings",
    } as Request;

    mockResponse = {
      locals: {
        defaultProperties: { timestamp: "2023-01-01T00:00:00Z", requestId: "abc123" },
      },
    } as unknown as Response;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getSettingsAsync", () => {
    it("should return 200 with all settings", async () => {
      const result = (await getSettingsAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.exists(result.content!.data);
      assert.equal(
        (result.content!.data as Record<string, unknown>)[SETTINGS.sensors.data_retention],
        "30 days",
      );
      assert.isTrue((mockService.getAllAsync as any).calledOnce);
    });

    it("should return 503 when service throws", async () => {
      (mockService.getAllAsync as any).rejects(new Error("DB error"));

      const result = (await getSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 503);
      assert.equal(result.error!.name, "Service Unavailable");
      assert.include(result.error!.details[0], "Failed to retrieve settings: DB error");
    });
  });

  describe("updateSettingsAsync", () => {
    it("should return 200 with updated keys", async () => {
      mockRequest.body = { [SETTINGS.sensors.data_retention]: "45 days" };

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.equal(
        (result.content!.data as Record<string, unknown>)[SETTINGS.sensors.data_retention],
        "45 days",
      );
      assert.isTrue(
        (mockService.setAsync as any).calledOnceWith(SETTINGS.sensors.data_retention, "45 days"),
      );
    });

    it("should return 200 with multiple updated keys", async () => {
      mockRequest.body = {
        [SETTINGS.sensors.data_retention]: "45 days",
        [SETTINGS.outputs.data_retention]: "90 days",
      };

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.equal(Object.keys(result.content!.data).length, 2);
      assert.equal((mockService.setAsync as any).callCount, 2);
    });

    it("should return 400 for unknown key", async () => {
      mockRequest.body = { "unknown.key": "value" };

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error!.name, "Bad Request");
      assert.include(result.error!.details[0], "Unknown setting key: unknown.key");
      assert.isTrue((mockService.setAsync as any).notCalled);
    });

    it("should return 400 for mixed valid and unknown keys", async () => {
      mockRequest.body = {
        [SETTINGS.sensors.data_retention]: "45 days",
        "unknown.key": "value",
      };

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error!.details.length, 1);
      assert.include(result.error!.details[0], "Unknown setting key: unknown.key");
      assert.isTrue((mockService.setAsync as any).notCalled);
    });

    it("should return 400 for type mismatch (number instead of string)", async () => {
      mockRequest.body = { [SETTINGS.sensors.data_retention]: 123 };

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error!.details[0], "Invalid type for");
      assert.include(result.error!.details[0], "expected string");
      assert.include(result.error!.details[0], "got number");
      assert.isTrue((mockService.setAsync as any).notCalled);
    });

    it("should return 200 for null value (null is accepted for string settings)", async () => {
      mockRequest.body = { [SETTINGS.sensors.data_retention]: null };

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.equal(
        (result.content!.data as Record<string, unknown>)[SETTINGS.sensors.data_retention],
        null,
      );
      assert.isTrue(
        (mockService.setAsync as any).calledOnceWith(SETTINGS.sensors.data_retention, null),
      );
    });

    it("should return 400 for invalid body (array)", async () => {
      mockRequest.body = ["not", "an", "object"];

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error!.details[0], "Request body must be a JSON object");
    });

    it("should return 400 for invalid body (null)", async () => {
      mockRequest.body = null;

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error!.details[0], "Request body must be a JSON object");
    });

    it("should return 400 for invalid body (string)", async () => {
      mockRequest.body = "not an object";

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error!.details[0], "Request body must be a JSON object");
    });

    it("should return 400 with multiple validation errors", async () => {
      mockRequest.body = {
        [SETTINGS.sensors.data_retention]: 123,
        "unknown.key": "value",
      };

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error!.details.length, 3);
    });

    it("should return 503 when service throws", async () => {
      mockRequest.body = { [SETTINGS.sensors.data_retention]: "45 days" };
      (mockService.setAsync as any).rejects(new Error("DB error"));

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 503);
      assert.equal(result.error!.name, "Service Unavailable");
      assert.include(result.error!.details[0], "Failed to update settings: DB error");
    });

    it("should return 200 with empty body (no keys to update)", async () => {
      mockRequest.body = {};

      const result = (await updateSettingsAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.deepEqual(result.content!.data, {});
      assert.isTrue((mockService.setAsync as any).notCalled);
    });

    describe("duration validation for retention settings", () => {
      it("should return 400 for invalid duration unit", async () => {
        mockRequest.body = { [SETTINGS.sensors.data_retention]: "30 foobars" };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

        assert.equal(result.statusCode, 400);
        assert.equal(result.error!.name, "Bad Request");
        assert.include(result.error!.details[0], "Unknown time unit");
        assert.include(result.error!.details[0], "foobars");
        assert.isTrue((mockService.setAsync as any).notCalled);
      });

      it("should return 400 for zero duration amount", async () => {
        mockRequest.body = { [SETTINGS.sensors.data_retention]: "0 days" };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

        assert.equal(result.statusCode, 400);
        assert.include(result.error!.details[0], "must be positive");
        assert.include(result.error!.details[0], "0");
        assert.isTrue((mockService.setAsync as any).notCalled);
      });

      it("should return 400 for malformed duration", async () => {
        mockRequest.body = { [SETTINGS.outputs.data_retention]: "abc" };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

        assert.equal(result.statusCode, 400);
        assert.include(result.error!.details[0], "does not match expected format");
        assert.isTrue((mockService.setAsync as any).notCalled);
      });

      it("should return 200 for valid duration with different units", async () => {
        mockRequest.body = {
          [SETTINGS.sensors.data_retention]: "2 weeks",
          [SETTINGS.outputs.data_retention]: "1 hour",
        };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as SuccessResponse;

        assert.equal(result.statusCode, 200);
        assert.equal((mockService.setAsync as any).callCount, 2);
      });

      it("should NOT validate duration for system.backup_retention", async () => {
        mockRequest.body = { [SETTINGS.system.backup_retention]: "not a duration" };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as SuccessResponse;

        assert.equal(result.statusCode, 200);
        assert.isTrue(
          (mockService.setAsync as any).calledOnceWith(
            SETTINGS.system.backup_retention,
            "not a duration",
          ),
        );
      });

      it("should return 400 with errors from multiple retention keys", async () => {
        mockRequest.body = {
          [SETTINGS.sensors.data_retention]: "bad value",
          [SETTINGS.outputs.data_retention]: "0 days",
        };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

        assert.equal(result.statusCode, 400);
        assert.isAtLeast(result.error!.details.length, 2);
        assert.isTrue((mockService.setAsync as any).notCalled);
      });

      it("should return 200 for null value on retention key (removes policy)", async () => {
        mockRequest.body = { [SETTINGS.sensors.data_retention]: null };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as SuccessResponse;

        assert.equal(result.statusCode, 200);
        assert.isTrue(
          (mockService.setAsync as any).calledOnceWith(SETTINGS.sensors.data_retention, null),
        );
      });

      it("should return 400 for empty string on retention key", async () => {
        mockRequest.body = { [SETTINGS.sensors.data_retention]: "" };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

        assert.equal(result.statusCode, 400);
        assert.include(result.error!.details[0], "empty");
        assert.isTrue((mockService.setAsync as any).notCalled);
      });

      it("should accept valid latitude and longitude settings", async () => {
        mockRequest.body = {
          [SETTINGS.system.latitude]: "40.7128",
          [SETTINGS.system.longitude]: "-74.0060",
        };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as SuccessResponse;

        assert.equal(result.statusCode, 200);
        assert.equal((mockService.setAsync as any).callCount, 2);
      });

      it("should reject an invalid latitude", async () => {
        mockRequest.body = { [SETTINGS.system.latitude]: "100.0" };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

        assert.equal(result.statusCode, 400);
        assert.include(result.error!.details[0], "must be between -90 and 90");
      });

      it("should reject an invalid longitude", async () => {
        mockRequest.body = { [SETTINGS.system.longitude]: "nope" };

        const result = (await updateSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

        assert.equal(result.statusCode, 400);
        assert.include(result.error!.details[0], "must be a valid number");
      });
    });
  });
});
