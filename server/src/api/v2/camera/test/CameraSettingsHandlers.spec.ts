import { describe, it, beforeEach, afterEach } from "mocha";
import { assert } from "chai";
import { createSandbox, SinonSandbox } from "sinon";
import { Request, Response } from "express";
import {
  createCameraSettingsAsync,
  deleteCameraSettingsAsync,
  getCameraSettingsAsync,
  listCameraSettingsAsync,
  updateCameraSettingsAsync,
} from "../handlers/CameraSettingsHandlers";
import { CameraManager } from "../../../../camera/CameraManager";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";

describe("CameraSettingsHandlers.ts", () => {
  let sandbox: SinonSandbox;
  let mockResponse: Response;
  let mockCameraManager: Partial<CameraManager>;
  const cameraSettings: SDBCameraSettings = {
    id: 1,
    enabled: true,
    name: "Test Camera",
    captureUrl: "http://camera:3002/capture",
    streamUrl: "http://camera:3002/stream.mjpg",
    healthUrl: "http://camera:3002/health",
    timelapseEnabled: true,
    imageRetentionDays: 7,
    imageRetentionSize: 1000,
    timelapseInterval: 60,
    timelapseStartTime: "08:00",
    timelapseEndTime: "20:00",
  };

  beforeEach(() => {
    sandbox = createSandbox();
    mockCameraManager = {
      listCameraSettingsAsync: sandbox.stub().resolves([cameraSettings]),
      getCameraSettingsAsync: sandbox.stub().resolves(cameraSettings),
      addCameraSettingsAsync: sandbox.stub().resolves(cameraSettings),
      updateCameraSettingsAsync: sandbox
        .stub()
        .callsFake(async (settings: SDBCameraSettings) => settings),
      deleteCameraSettingsAsync: sandbox.stub().resolves(true),
    };

    mockResponse = {
      locals: {
        defaultProperties: { timestamp: "2023-01-01T00:00:00Z" },
      },
    } as unknown as Response;
  });

  afterEach(() => {
    sandbox.restore();
  });

  function createRequest(overrides: Partial<Request> = {}) {
    return {
      app: {
        get: ((key: string) => {
          if (key === "cameraManager") return mockCameraManager;
          return undefined;
        }) as any,
      },
      originalUrl: "/api/v2/camera/1/settings",
      params: { cameraId: "1" },
      ...overrides,
    } as Request;
  }

  it("lists all camera settings", async () => {
    const result = await listCameraSettingsAsync(createRequest(), mockResponse);

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.content?.data, [cameraSettings]);
  });

  it("gets one camera by id", async () => {
    const result = await getCameraSettingsAsync(createRequest(), mockResponse);

    assert.equal(result.statusCode, 200);
    assert.property(result, "content");
    if (!("content" in result)) {
      assert.fail("Expected success response content");
    }
    assert.deepEqual(result.content?.data, cameraSettings);
  });

  it("creates a new camera", async () => {
    const request = createRequest({
      originalUrl: "/api/v2/camera",
      body: { ...cameraSettings, id: undefined },
      params: {},
    });

    const result = await createCameraSettingsAsync(request, mockResponse);

    assert.equal(result.statusCode, 201);
    assert.property(result, "content");
    if (!("content" in result)) {
      assert.fail("Expected success response content");
    }
    assert.equal(result.content?.data.id, 1);
  });

  it("updates a camera", async () => {
    const request = createRequest({
      body: {
        ...cameraSettings,
        name: "Updated Camera",
      },
    });

    const result = await updateCameraSettingsAsync(request, mockResponse);

    assert.equal(result.statusCode, 200);
    assert.property(result, "content");
    if (!("content" in result)) {
      assert.fail("Expected success response content");
    }
    assert.equal(result.content?.data.name, "Updated Camera");
    assert.isTrue((mockCameraManager.updateCameraSettingsAsync as any).calledOnce);
  });

  it("validates camera urls", async () => {
    const request = createRequest({
      body: {
        ...cameraSettings,
        captureUrl: "bad-url",
      },
    });

    const result = await updateCameraSettingsAsync(request, mockResponse);

    assert.equal(result.statusCode, 400);
    assert.property(result, "error");
    if (!("error" in result)) {
      assert.fail("Expected error response details");
    }
    assert.include(result.error?.details ?? [], "captureUrl must be a valid http or https URL");
  });

  it("deletes a camera", async () => {
    const result = await deleteCameraSettingsAsync(createRequest(), mockResponse);

    assert.equal(result.statusCode, 200);
    assert.isTrue((mockCameraManager.deleteCameraSettingsAsync as any).calledOnceWithExactly(1));
  });
});
