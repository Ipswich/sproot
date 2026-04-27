import { assert } from "chai";
import type { ReadStream } from "fs";
import { describe, it, beforeEach, afterEach } from "mocha";
import sinon, { type SinonSandbox } from "sinon";
import winston from "winston";
import { CameraManager } from "../CameraManager";
import ImageCapture from "../ImageCapture";
import StreamProxy from "../StreamProxy";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { TIMELAPSE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";

describe("CameraManager", () => {
  let sandbox: SinonSandbox;
  let logger: winston.Logger;
  let createdManagers: CameraManager[];
  let createCameraProcessStub: sinon.SinonStub;
  let cleanupCameraProcessStub: sinon.SinonStub;
  let runImageRetentionAsyncStub: sinon.SinonStub;
  let regenerateTimelapseArchiveAsyncStub: sinon.SinonStub;
  let updateTimelapseSettingsStub: sinon.SinonStub;

  const cameraSettings: SDBCameraSettings = {
    id: 1,
    enabled: true,
    name: "Pi Camera",
    xVideoResolution: 1920,
    yVideoResolution: 1080,
    videoFps: 30,
    xImageResolution: 1920,
    yImageResolution: 1080,
    timelapseEnabled: false,
    imageRetentionDays: 7,
    imageRetentionSize: 1024,
    timelapseInterval: null,
    timelapseStartTime: null,
    timelapseEndTime: null,
  };

  const createManager = async (
    settings: SDBCameraSettings[] = [],
    overrides?: Partial<Record<string, sinon.SinonStub>>,
  ) => {
    const sprootDB = {
      getCameraSettingsAsync: sandbox.stub().resolves(settings),
      ...overrides,
    };

    const manager = await CameraManager.createInstanceAsync(sprootDB as any, "test-key", logger);
    createdManagers.push(manager);
    return { manager, sprootDB };
  };

  const disposeManager = async (manager: CameraManager) => {
    createdManagers = createdManagers.filter((currentManager) => currentManager !== manager);
    await manager[Symbol.asyncDispose]();
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logger = winston.createLogger({ silent: true });
    createdManagers = [];

    runImageRetentionAsyncStub = sandbox
      .stub(ImageCapture.prototype, "runImageRetentionAsync")
      .resolves();
    regenerateTimelapseArchiveAsyncStub = sandbox
      .stub(ImageCapture.prototype, "regenerateTimelapseArchiveAsync")
      .resolves();
    updateTimelapseSettingsStub = sandbox.stub(ImageCapture.prototype, "updateTimelapseSettings");
    createCameraProcessStub = sandbox.stub(CameraManager.prototype as any, "createCameraProcess");
    cleanupCameraProcessStub = sandbox.stub(CameraManager.prototype as any, "cleanupCameraProcess");
  });

  afterEach(async () => {
    for (const manager of createdManagers.reverse()) {
      await manager[Symbol.asyncDispose]();
    }
    createdManagers = [];
    sandbox.restore();
  });

  it("stores the loaded camera settings", async () => {
    const manager = (await createManager([cameraSettings])).manager;

    assert.deepEqual(manager.cameraSettings, cameraSettings);
  });

  it("returns null settings when no camera settings are found", async () => {
    const manager = (await createManager()).manager;

    assert.isNull(manager.cameraSettings);
  });

  it("delegates latest image access to ImageCapture", async () => {
    const latestImage = Buffer.from("latest-image");
    const getLatestImageAsyncStub = sandbox
      .stub(ImageCapture.prototype, "getLatestImageAsync")
      .resolves(latestImage);

    const manager = (await createManager()).manager;

    assert.equal(await manager.getLatestImageAsync(), latestImage);
    assert.isTrue(getLatestImageAsyncStub.calledOnce);
  });

  it("delegates timelapse archive progress access to ImageCapture", async () => {
    const progress = { isGenerating: true, archiveProgress: 42 };
    const getTimelapseGenerationStatusStub = sandbox
      .stub(ImageCapture.prototype, "getTimelapseGenerationStatus")
      .returns(progress);

    const manager = (await createManager()).manager;

    assert.deepEqual(manager.getTimelapseArchiveProgress(), progress);
    assert.isTrue(getTimelapseGenerationStatusStub.calledOnce);
  });

  it("delegates timelapse archive retrieval to ImageCapture", async () => {
    const archive = { pipe: sandbox.stub() } as unknown as ReadStream;
    const getTimelapseArchiveAsyncStub = sandbox
      .stub(ImageCapture.prototype, "getTimelapseArchiveAsync")
      .resolves(archive);

    const manager = (await createManager()).manager;

    assert.equal(await manager.getTimelapseArchiveAsync(), archive);
    assert.isTrue(getTimelapseArchiveAsyncStub.calledOnce);
  });

  it("delegates timelapse image count access to ImageCapture", async () => {
    const getTimelapseImageCountStub = sandbox
      .stub(ImageCapture.prototype, "getTimelapseImageCount")
      .returns(12);

    const manager = (await createManager()).manager;

    assert.equal(manager.getTimelapseImageCount(), 12);
    assert.isTrue(getTimelapseImageCountStub.calledOnce);
  });

  it("delegates timelapse archive size access to ImageCapture", async () => {
    const getTimelapseArchiveSizeAsyncStub = sandbox
      .stub(ImageCapture.prototype, "getTimelapseArchiveSizeAsync")
      .resolves(2048);

    const manager = (await createManager()).manager;

    assert.equal(await manager.getTimelapseArchiveSizeAsync(), 2048);
    assert.isTrue(getTimelapseArchiveSizeAsyncStub.calledOnce);
  });

  it("returns the last timelapse generation duration when timelapse is enabled", async () => {
    const getLastTimelapseGenerationDurationStub = sandbox
      .stub(ImageCapture.prototype, "getLastTimelapseGenerationDuration")
      .returns(3210);
    const enabledSettings = { ...cameraSettings, timelapseEnabled: true };

    const manager = (await createManager([enabledSettings])).manager;

    assert.equal(manager.getLastTimelapseGenerationDuration(), 3210);
    assert.isTrue(getLastTimelapseGenerationDurationStub.calledOnce);
  });

  it("returns null for the last timelapse generation duration when timelapse is disabled", async () => {
    const getLastTimelapseGenerationDurationStub = sandbox
      .stub(ImageCapture.prototype, "getLastTimelapseGenerationDuration")
      .returns(3210);

    const manager = (await createManager([cameraSettings])).manager;

    assert.isNull(manager.getLastTimelapseGenerationDuration());
    assert.isTrue(getLastTimelapseGenerationDurationStub.notCalled);
  });

  it("clears timelapse images using the configured directory", async () => {
    const clearAllImagesAsyncStub = sandbox
      .stub(ImageCapture.prototype, "clearAllImagesAsync")
      .resolves(true);

    const manager = (await createManager()).manager;

    assert.isTrue(await manager.clearAllImagesAsync());
    assert.isTrue(clearAllImagesAsyncStub.calledOnceWithExactly(TIMELAPSE_DIRECTORY));
  });

  it("forces timelapse archive regeneration without validation", async () => {
    const manager = (await createManager()).manager;

    await manager.regenerateTimelapseArchiveAsync();

    assert.isTrue(regenerateTimelapseArchiveAsyncStub.calledWithExactly(false));
  });

  it("assigns the stream proxy when startup succeeds", async () => {
    const startAsyncStub = sandbox.stub(StreamProxy.prototype, "startAsync").resolves(true);
    const reconnectAsyncStub = sandbox.stub(StreamProxy.prototype, "reconnectAsync").resolves(true);
    const stopAsyncStub = sandbox.stub(StreamProxy.prototype, "stopAsync").resolves();

    const manager = (await createManager([cameraSettings])).manager;

    assert.isTrue(startAsyncStub.calledOnce);
    assert.isNotNull(manager.getFrameBuffer());
    assert.isTrue(await manager.reconnectLivestreamAsync());
    assert.isTrue(reconnectAsyncStub.calledOnce);
    assert.isTrue(createCameraProcessStub.calledOnceWithExactly(cameraSettings));
    assert.isTrue(runImageRetentionAsyncStub.calledOnceWithExactly(1024, 7));
    assert.isTrue(updateTimelapseSettingsStub.calledOnceWithExactly(cameraSettings));

    await disposeManager(manager);

    assert.isTrue(stopAsyncStub.calledOnce);
    assert.isTrue(cleanupCameraProcessStub.calledOnce);
  });

  it("does not assign the stream proxy when startup fails", async () => {
    const warnStub = sandbox.stub(logger, "warn");
    const startAsyncStub = sandbox.stub(StreamProxy.prototype, "startAsync").resolves(false);
    const reconnectAsyncStub = sandbox.stub(StreamProxy.prototype, "reconnectAsync").resolves(true);
    const stopAsyncStub = sandbox.stub(StreamProxy.prototype, "stopAsync").resolves();

    const manager = (await createManager([cameraSettings])).manager;

    assert.isTrue(startAsyncStub.calledOnce);
    assert.isNull(manager.getFrameBuffer());
    assert.isFalse(await manager.reconnectLivestreamAsync());
    assert.isTrue(reconnectAsyncStub.notCalled);

    await disposeManager(manager);

    assert.isTrue(stopAsyncStub.notCalled);
    const warnings = warnStub.getCalls().map((call) => String(call.args[0]));
    assert.isTrue(warnings.includes("CameraManager: stream proxy failed to connect to upstream"));
    assert.isTrue(warnings.includes("CameraManager: stream proxy not initialized"));
  });

  it("stops the existing stream proxy when the camera is disabled", async () => {
    const startAsyncStub = sandbox.stub(StreamProxy.prototype, "startAsync").resolves(true);
    const stopAsyncStub = sandbox.stub(StreamProxy.prototype, "stopAsync").resolves();
    const sprootDB = {
      getCameraSettingsAsync: sandbox.stub(),
    };
    sprootDB.getCameraSettingsAsync.onFirstCall().resolves([cameraSettings]);
    sprootDB.getCameraSettingsAsync
      .onSecondCall()
      .resolves([{ ...cameraSettings, enabled: false }]);

    const manager = await CameraManager.createInstanceAsync(sprootDB as any, "test-key", logger);
    createdManagers.push(manager);

    assert.isTrue(startAsyncStub.calledOnce);
    assert.isNotNull(manager.getFrameBuffer());

    await manager.regenerateAsync();

    assert.isTrue(stopAsyncStub.calledOnce);
    assert.isNull(manager.getFrameBuffer());
  });

  it("returns the same instance and does nothing after disposal", async () => {
    const getCameraSettingsAsync = sandbox.stub().resolves([cameraSettings]);
    const startAsyncStub = sandbox.stub(StreamProxy.prototype, "startAsync").resolves(true);
    const manager = (await createManager([], { getCameraSettingsAsync })).manager;

    await manager[Symbol.asyncDispose]();
    createdManagers = createdManagers.filter((currentManager) => currentManager !== manager);
    const result = await manager.regenerateAsync();

    assert.strictEqual(result, manager);
    assert.isTrue(startAsyncStub.calledOnce);
    assert.isTrue(getCameraSettingsAsync.calledOnce);
  });

  it("skips overlapping regenerate calls while an update is already in progress", async () => {
    const warnStub = sandbox.stub(logger, "warn");
    let resolveSettings!: (value: SDBCameraSettings[]) => void;
    const getCameraSettingsAsync = sandbox.stub();
    getCameraSettingsAsync.onFirstCall().resolves([]);
    getCameraSettingsAsync.onSecondCall().callsFake(
      () =>
        new Promise<SDBCameraSettings[]>((resolve) => {
          resolveSettings = resolve;
        }),
    );

    const manager = (await createManager([], { getCameraSettingsAsync })).manager;

    const firstRegenerate = manager.regenerateAsync();
    const secondRegenerate = manager.regenerateAsync();

    assert.strictEqual(await secondRegenerate, manager);
    const warnings = warnStub.getCalls().map((call) => String(call.args[0]));
    assert.isTrue(
      warnings.includes("CameraManager is already updating, skipping regenerateAsync call."),
    );
    assert.equal(getCameraSettingsAsync.callCount, 2);

    resolveSettings([cameraSettings]);
    assert.strictEqual(await firstRegenerate, manager);
    await disposeManager(manager);
  });
});
