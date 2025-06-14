import { describe, it, beforeEach } from "mocha";
import { assert } from "chai";
import { createSandbox, SinonSandbox } from "sinon";
import { Request, Response } from "express";
import { getCameraSettings, updateCameraSettingsAsync } from "../handlers/CameraSettingsHandlers";
import { CameraManager } from "../../../../camera/CameraManager";
import { ISprootDB } from "@sproot/database/ISprootDB";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";

describe("CameraSettingsHandlers", () => {
  let sandbox: SinonSandbox;
  let mockRequest: Request;
  let mockResponse: Response;
  let mockCameraManager: Partial<CameraManager>;
  let mockSprootDB: Partial<ISprootDB>;

  beforeEach(() => {
    sandbox = createSandbox();

    mockCameraManager = {
      cameraSettings: {
        id: 1,
        enabled: true,
        name: "Test Camera",
        xVideoResolution: 1920,
        yVideoResolution: 1080,
        videoFps: 30,
        xImageResolution: 2048,
        yImageResolution: 1536,
        timelapseEnabled: false,
        imageRetentionDays: 7,
        imageRetentionSize: 1000,
        timelapseInterval: 60,
        timelapseStartTime: "08:00",
        timelapseEndTime: "20:00",
      } as SDBCameraSettings,
      initializeOrRegenerateAsync: sandbox.stub().resolves(),
    };

    mockSprootDB = {
      updateCameraSettingsAsync: sandbox.stub().resolves(),
    };

    mockRequest = {
      app: {
        get: ((key: string) => {
          if (key === "cameraManager") return mockCameraManager;
          if (key === "sprootDB") return mockSprootDB;
          return undefined;
        }) as any,
      },
      originalUrl: "/api/v2/camera/settings",
    } as Request;

    mockResponse = {
      locals: {
        defaultProperties: { timestamp: "2023-01-01T00:00:00Z" },
      },
    } as unknown as Response;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getCameraSettings", () => {
    it("should return camera settings with status code 200", () => {
      const result = getCameraSettings(mockRequest, mockResponse);

      assert.equal(result.statusCode, 200);
      assert.deepEqual(result.content!.data, mockCameraManager.cameraSettings);
      assert.equal(result.timestamp, "2023-01-01T00:00:00Z");
    });
  });

  describe("updateCameraSettingsAsync", () => {
    let validSettings: SDBCameraSettings;

    beforeEach(() => {
      validSettings = {
        id: 1,
        enabled: true,
        name: "Updated Camera",
        xVideoResolution: 1920,
        yVideoResolution: 1080,
        videoFps: 30,
        xImageResolution: 2048,
        yImageResolution: 1536,
        timelapseEnabled: true,
        imageRetentionDays: 14,
        imageRetentionSize: 2000,
        timelapseInterval: 120,
        timelapseStartTime: "09:00",
        timelapseEndTime: "21:00",
      };
    });

    it("should return 200 for successfully updating camera settings", async () => {
      mockRequest.body = validSettings;

      const result = (await updateCameraSettingsAsync(
        mockRequest,
        mockResponse,
      )) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.equal(result.content!.data.id, 1);
      assert.equal(result.content!.data.name, "Updated Camera");
      assert.isTrue((mockSprootDB.updateCameraSettingsAsync as any).calledOnce);
    });

    it("should return 200 on null for optional resolution fields", async () => {
      mockRequest.body = {
        ...validSettings,
        xVideoResolution: null,
        yVideoResolution: null,
        videoFps: null,
        xImageResolution: null,
        yImageResolution: null,
      };

      const result = (await updateCameraSettingsAsync(
        mockRequest,
        mockResponse,
      )) as SuccessResponse;

      assert.equal(result.statusCode, 200);
    });

    it("should return 200 on null for timelapseStartTime and timelapseEndTime", async () => {
      mockRequest.body = { ...validSettings, timelapseStartTime: null, timelapseEndTime: null };

      const result = (await updateCameraSettingsAsync(
        mockRequest,
        mockResponse,
      )) as SuccessResponse;

      assert.equal(result.statusCode, 200);
    });

    // it('should return 400 for invalid id', async () => {
    //   mockRequest.body = { ...validSettings, id: -1 };

    //   const result = await updateCameraSettingsAsync(mockRequest, mockResponse) as ErrorResponse;

    //   assert.equal(result.statusCode, 400);
    //   assert.equal(result.error.name, 'Bad Request');
    //   assert.include(result.error.details, 'id must be a non-negative number');
    // });

    it("should return 400 for invalid enabled field", async () => {
      mockRequest.body = { ...validSettings, enabled: "true" };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error.details, "enabled must be a boolean");
    });

    it("should return 400 for invalid name length", async () => {
      mockRequest.body = { ...validSettings, name: "" };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error.details, "name must be a string between 1 and 64 characters");
    });

    it("should return 400 for name too long", async () => {
      mockRequest.body = { ...validSettings, name: "a".repeat(65) };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error.details, "name must be a string between 1 and 64 characters");
    });

    it("should return 400 for invalid video resolution", async () => {
      mockRequest.body = { ...validSettings, xVideoResolution: 0 };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error.details, "xVideoResolution must be a positive number or null");
    });

    it("should return 400 for invalid timelapseInterval", async () => {
      mockRequest.body = { ...validSettings, timelapseInterval: 0 };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error.details, "timelapseInterval must be a number between 1 and 1440");
    });

    it("should return 400 for timelapseInterval too high", async () => {
      mockRequest.body = { ...validSettings, timelapseInterval: 1441 };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error.details, "timelapseInterval must be a number between 1 and 1440");
    });

    it("should return 400 for invalid timelapseStartTime format", async () => {
      mockRequest.body = { ...validSettings, timelapseStartTime: "9:00" };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(
        result.error.details,
        "timelapseStartTime must be a string in HH:MM format, or null",
      );
    });

    it("should return 400 for invalid timelapseEndTime format", async () => {
      mockRequest.body = { ...validSettings, timelapseEndTime: "21:0" };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(
        result.error.details,
        "timelapseEndTime must be a string in HH:MM format, or null",
      );
    });

    it("should return 400 for mismatched timelapseStartTime and timelapseEndTime", async () => {
      mockRequest.body = { ...validSettings, timelapseStartTime: "08:00", timelapseEndTime: null };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(
        result.error.details,
        "Both timelapseStartTime and timelapseEndTime must be provided or both must be null",
      );

      mockRequest.body = { ...validSettings, timelapseStartTime: null, timelapseEndTime: "20:00" };
      const result2 = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(result2.statusCode, 400);
    });

    it("should return 400 for negative imageRetentionDays", async () => {
      mockRequest.body = { ...validSettings, imageRetentionDays: -1 };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.include(result.error.details, "imageRetentionDays must be a non-negative number");
    });

    it("should return 503 when database update fails", async () => {
      mockRequest.body = validSettings;
      (mockSprootDB.updateCameraSettingsAsync as any).rejects(new Error("Database error"));

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 503);
      assert.equal(result.error.name, "Internal Server Error");
      assert.include(result.error.details, "Failed to update camera settings: Database error");
    });

    it("should return 400 with multiple validation errors", async () => {
      mockRequest.body = {
        ...validSettings,
        enabled: "invalid",
        name: "",
        timelapseInterval: 0,
      };

      const result = (await updateCameraSettingsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.error!.details.length, 3);
    });
  });
});
