import { assert } from "chai";
import { describe, it, beforeEach, afterEach } from "mocha";
import sinon, { type SinonSandbox } from "sinon";
import type { SinonFakeTimers } from "sinon";
import winston from "winston";
import { CameraManager } from "../CameraManager";
import ImageCapture from "../ImageCapture";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { ICameraRepository } from "../../database/repositories/camera/ICameraRepository";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { TimeExpressionResolver } from "../../automation/conditions/TimeExpressionResolver";

describe("CameraManager", () => {
  let sandbox: SinonSandbox;
  let clock: SinonFakeTimers | null;
  let logger: winston.Logger;
  let createdManagers: CameraManager[];

  const cameraSettings: SDBCameraSettings = {
    id: 1,
    enabled: true,
    name: "Pi Camera",
    captureUrl: "http://camera:3002/capture",
    streamUrl: "http://camera:3002/stream.mjpg",
    healthUrl: "http://camera:3002/health",
    latestImageRefreshIntervalSeconds: 60,
    timelapseEnabled: false,
    imageRetentionDays: 7,
    imageRetentionSize: 1024,
    timelapseInterval: null,
    timelapseStartTime: null,
    timelapseEndTime: null,
  };

  const createManager = async (
    settings: SDBCameraSettings[] = [],
    overrides?: Partial<ICameraRepository>,
  ) => {
    const cameraRepository: ICameraRepository = {
      getAllAsync: sandbox.stub().resolves(settings),
      getByIdAsync: sandbox.stub().callsFake(async (id: number) => {
        return settings.find((setting) => setting.id === id) ?? null;
      }),
      addAsync: sandbox.stub().resolves(2),
      updateAsync: sandbox.stub().resolves(),
      deleteAsync: sandbox.stub().resolves(),
      ...(overrides ?? {}),
    };

    const eventBus = new MemoryEventBus(logger);
    const manager = await CameraManager.createInstanceAsync(
      eventBus,
      cameraRepository,
      TimeExpressionResolver.createNoop(),
      logger,
    );
    createdManagers.push(manager);
    return { manager, cameraRepository };
  };

  const createDeferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((innerResolve) => {
      resolve = innerResolve;
    });

    return { promise, resolve };
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = null;
    logger = winston.createLogger({ silent: true });
    createdManagers = [];
    sandbox.stub(ImageCapture.prototype, "captureLatestImageAsync").resolves();
    sandbox.stub(ImageCapture.prototype, "runImageRetentionAsync").resolves();
    sandbox.stub(ImageCapture.prototype, "regenerateTimelapseArchiveAsync").resolves();
    sandbox.stub(ImageCapture.prototype, "updateTimelapseSettings");
  });

  afterEach(async () => {
    for (const manager of createdManagers.reverse()) {
      await manager[Symbol.asyncDispose]();
    }
    clock?.restore();
    sandbox.restore();
  });

  it("stores loaded camera settings as a list", async () => {
    const manager = (await createManager([cameraSettings])).manager;

    assert.deepEqual(manager.cameraSettings, [cameraSettings]);
  });

  it("returns an empty list when no camera settings are found", async () => {
    const manager = (await createManager()).manager;

    assert.deepEqual(manager.cameraSettings, []);
  });

  it("delegates latest image access by camera id", async () => {
    const latestImage = Buffer.from("latest-image");
    const getLatestImageAsyncStub = sandbox
      .stub(ImageCapture.prototype, "getLatestImageAsync")
      .resolves(latestImage);

    const manager = (await createManager([cameraSettings])).manager;

    assert.equal(await manager.getLatestImageAsync(1), latestImage);
    assert.isTrue(getLatestImageAsyncStub.calledOnce);
  });

  it("captures a fresh image on demand and returns it", async () => {
    const latestImage = Buffer.from("latest-image");
    const captureLatestImageAsyncStub = ImageCapture.prototype
      .captureLatestImageAsync as sinon.SinonStub;
    captureLatestImageAsyncStub.resolves(true);
    const getLatestImageAsyncStub = sandbox
      .stub(ImageCapture.prototype, "getLatestImageAsync")
      .resolves(latestImage);

    const manager = (await createManager([cameraSettings])).manager;

    assert.equal(await manager.captureLatestImageAsync(1), latestImage);
    assert.isTrue(captureLatestImageAsyncStub.calledWithExactly(cameraSettings.captureUrl, {}));
    assert.isTrue(getLatestImageAsyncStub.called);
  });

  it("returns per-camera timelapse progress", async () => {
    const progress = { isGenerating: true, archiveProgress: 42 };
    sandbox.stub(ImageCapture.prototype, "getTimelapseGenerationStatus").returns(progress);

    const manager = (await createManager([cameraSettings])).manager;

    assert.deepEqual(manager.getTimelapseArchiveProgress(1), progress);
  });

  it("creates a new camera settings row", async () => {
    const { manager, cameraRepository } = await createManager([cameraSettings]);

    const created = await manager.addCameraSettingsAsync({
      enabled: true,
      name: "Second Camera",
      captureUrl: "http://camera-2:3002/capture",
      streamUrl: "http://camera-2:3002/stream.mjpg",
      healthUrl: "http://camera-2:3002/health",
      latestImageRefreshIntervalSeconds: 60,
      timelapseEnabled: false,
      imageRetentionDays: 7,
      imageRetentionSize: 512,
      timelapseInterval: null,
      timelapseStartTime: null,
      timelapseEndTime: null,
    });

    assert.equal(created.id, 2);
    assert.isTrue((cameraRepository.addAsync as sinon.SinonStub).calledOnce);
  });

  it("updates a camera when it exists", async () => {
    const { manager, cameraRepository } = await createManager([cameraSettings]);

    const updated = await manager.updateCameraSettingsAsync({
      ...cameraSettings,
      name: "Updated Camera",
    });

    assert.equal(updated?.name, "Updated Camera");
    assert.isTrue((cameraRepository.updateAsync as sinon.SinonStub).calledOnce);
  });

  it("returns null when updating a missing camera", async () => {
    const { manager } = await createManager([]);

    const updated = await manager.updateCameraSettingsAsync(cameraSettings);

    assert.isNull(updated);
  });

  it("deletes a camera when it exists", async () => {
    const { manager, cameraRepository } = await createManager([cameraSettings]);

    const deleted = await manager.deleteCameraSettingsAsync(1);

    assert.isTrue(deleted);
    assert.isTrue((cameraRepository.deleteAsync as sinon.SinonStub).calledOnceWithExactly(1));
  });

  it("refreshes latest images using each camera's configured interval", async () => {
    clock = sinon.useFakeTimers({
      now: new Date("2026-01-01T00:00:00.000Z"),
      shouldAdvanceTime: false,
      toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });
    const captureLatestImageAsyncStub = ImageCapture.prototype
      .captureLatestImageAsync as sinon.SinonStub;
    const cameraOne = {
      ...cameraSettings,
      latestImageRefreshIntervalSeconds: 5,
    };
    const cameraTwo = {
      ...cameraSettings,
      id: 2,
      name: "Slow Camera",
      captureUrl: "http://camera-2:3002/capture",
      latestImageRefreshIntervalSeconds: 60,
    };

    await createManager([cameraOne, cameraTwo]);
    captureLatestImageAsyncStub.resetHistory();

    await clock.tickAsync(4_000);
    assert.equal(captureLatestImageAsyncStub.callCount, 0);

    await clock.tickAsync(1_000);
    assert.equal(captureLatestImageAsyncStub.callCount, 1);
    assert.isTrue(
      captureLatestImageAsyncStub.firstCall.calledWithExactly(cameraOne.captureUrl, {}),
    );

    await clock.tickAsync(55_000);
    assert.equal(captureLatestImageAsyncStub.callCount, 13);
    assert.deepEqual(
      captureLatestImageAsyncStub.getCalls().map((call) => call.args[0]),
      [
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera:3002/capture",
        "http://camera-2:3002/capture",
      ],
    );
  });

  it("runs latest image capture in parallel across cameras", async () => {
    clock = sinon.useFakeTimers({
      now: new Date("2026-01-01T00:00:00.000Z"),
      shouldAdvanceTime: false,
      toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });
    const captureLatestImageAsyncStub = ImageCapture.prototype
      .captureLatestImageAsync as sinon.SinonStub;
    await createManager([
      {
        ...cameraSettings,
        latestImageRefreshIntervalSeconds: 1,
      },
      {
        ...cameraSettings,
        id: 2,
        name: "Second Camera",
        captureUrl: "http://camera-2:3002/capture",
        latestImageRefreshIntervalSeconds: 1,
      },
    ]);

    const firstDeferred = createDeferred();
    const secondDeferred = createDeferred();
    captureLatestImageAsyncStub.onFirstCall().returns(firstDeferred.promise);
    captureLatestImageAsyncStub.onSecondCall().returns(secondDeferred.promise);
    captureLatestImageAsyncStub.resetHistory();

    clock.tick(1_000);

    assert.equal(captureLatestImageAsyncStub.callCount, 2);

    firstDeferred.resolve();
    secondDeferred.resolve();
    await Promise.resolve();
  });

  it("runs camera maintenance on its own minute cadence", async () => {
    clock = sinon.useFakeTimers({
      now: new Date("2026-01-01T00:00:00.000Z"),
      shouldAdvanceTime: false,
      toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });
    const runImageRetentionAsyncStub = ImageCapture.prototype
      .runImageRetentionAsync as sinon.SinonStub;
    const regenerateTimelapseArchiveAsyncStub = ImageCapture.prototype
      .regenerateTimelapseArchiveAsync as sinon.SinonStub;

    await createManager([{ ...cameraSettings, latestImageRefreshIntervalSeconds: 5 }]);
    runImageRetentionAsyncStub.resetHistory();
    regenerateTimelapseArchiveAsyncStub.resetHistory();

    await clock.tickAsync(59_000);
    assert.equal(runImageRetentionAsyncStub.callCount, 0);
    assert.equal(regenerateTimelapseArchiveAsyncStub.callCount, 0);

    await clock.tickAsync(1_000);
    assert.equal(runImageRetentionAsyncStub.callCount, 1);
    assert.equal(regenerateTimelapseArchiveAsyncStub.callCount, 1);
  });
});
