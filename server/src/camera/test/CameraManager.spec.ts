import { assert } from "chai";
import { describe, it, beforeEach, afterEach } from "mocha";
import sinon, { type SinonSandbox } from "sinon";
import winston from "winston";
import { CameraManager } from "../CameraManager";
import ImageCapture from "../ImageCapture";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { ICameraRepository } from "../../database/repositories/camera/ICameraRepository";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { TimeExpressionResolver } from "../../automation/conditions/TimeExpressionResolver";

describe("CameraManager", () => {
  let sandbox: SinonSandbox;
  let logger: winston.Logger;
  let createdManagers: CameraManager[];

  const cameraSettings: SDBCameraSettings = {
    id: 1,
    enabled: true,
    name: "Pi Camera",
    captureUrl: "http://camera:3002/capture",
    streamUrl: "http://camera:3002/stream.mjpg",
    healthUrl: "http://camera:3002/health",
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

  beforeEach(() => {
    sandbox = sinon.createSandbox();
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
});
