import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { CRON } from "@sproot/common/utility/Constants";
import { ICameraRepository } from "../database/repositories/camera/ICameraRepository";
import { CronJob } from "cron";
import winston from "winston";
import ImageCapture from "./ImageCapture";
import { IEventBus } from "../eventbus/IEventBus";
import { CameraSettingsModifiedEvent } from "../eventbus/events/camera/CameraSettingsModifiedEvent";
import { Events } from "../eventbus/events/Events";
import { PromiseQueue } from "./PromiseQueue";
import { TimeExpressionResolver } from "../automation/conditions/TimeExpressionResolver";

type ManagedCamera = {
  settings: SDBCameraSettings;
  imageCapture: ImageCapture;
};

class CameraManager {
  #eventBus: IEventBus;
  #cameraRepository: ICameraRepository;
  #logger: winston.Logger;
  #timeExpressionResolver: TimeExpressionResolver;
  #managedCameras = new Map<number, ManagedCamera>();
  #archiveQueue = new PromiseQueue();
  #isUpdating: boolean = false;
  #imageCaptureCronJob: CronJob;
  #disposed: boolean = false;
  #listenerCleanupFunction: () => void;

  static createInstanceAsync(
    eventBus: IEventBus,
    cameraRepository: ICameraRepository,
    timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
    logger: winston.Logger,
  ): Promise<CameraManager> {
    const cameraManager = new CameraManager(
      eventBus,
      cameraRepository,
      timeExpressionResolver,
      logger,
    );
    return cameraManager.regenerateAsync();
  }

  private constructor(
    eventBus: IEventBus,
    cameraRepository: ICameraRepository,
    timeExpressionResolver: TimeExpressionResolver,
    logger: winston.Logger,
  ) {
    this.#eventBus = eventBus;
    this.#cameraRepository = cameraRepository;
    this.#logger = logger;
    this.#timeExpressionResolver = timeExpressionResolver;
    this.#imageCaptureCronJob = new CronJob(
      CRON.EVERY_MINUTE,
      async () => {
        await this.refreshEnabledCamerasAsync();
      },
      undefined,
      true,
      undefined,
      null,
      true,
      undefined,
      undefined,
      undefined,
      (err: unknown) => this.#logger.error(`Image capture cron error: ${err}`),
    );

    const cameraSettingsModifiedListener = async (_event: CameraSettingsModifiedEvent) => {
      await this.regenerateAsync();
    };

    const cameraSettingsModifiedUnsubscribe = this.#eventBus.subscribe(
      Events.CAMERA_SETTINGS_MODIFIED_EVENT,
      cameraSettingsModifiedListener,
    );

    this.#listenerCleanupFunction = () => {
      cameraSettingsModifiedUnsubscribe();
    };
  }

  get cameraSettings() {
    return Array.from(this.#managedCameras.values()).map((camera) => camera.settings);
  }

  async listCameraSettingsAsync() {
    return this.cameraSettings;
  }

  async getCameraSettingsAsync(cameraId: number) {
    return (
      this.#managedCameras.get(cameraId)?.settings ?? this.#cameraRepository.getByIdAsync(cameraId)
    );
  }

  getLatestImageAsync(cameraId: number) {
    return (
      this.#managedCameras.get(cameraId)?.imageCapture.getLatestImageAsync() ??
      Promise.resolve(null)
    );
  }

  getTimelapseArchiveProgress(cameraId: number) {
    return (
      this.#managedCameras.get(cameraId)?.imageCapture.getTimelapseGenerationStatus() ?? {
        isGenerating: false,
        archiveProgress: 0,
      }
    );
  }

  getTimelapseArchiveAsync(cameraId: number) {
    return (
      this.#managedCameras.get(cameraId)?.imageCapture.getTimelapseArchiveAsync() ??
      Promise.resolve(null)
    );
  }

  getTimelapseImageCount() {
    return Array.from(this.#managedCameras.values()).reduce((total, camera) => {
      return total + camera.imageCapture.getTimelapseImageCount();
    }, 0);
  }

  async getTimelapseArchiveSizeAsync() {
    const sizes = await Promise.all(
      Array.from(this.#managedCameras.values()).map((camera) => {
        return camera.imageCapture.getTimelapseArchiveSizeAsync();
      }),
    );

    return sizes.reduce<number>((total, size) => total + (size ?? 0), 0);
  }

  getLastTimelapseGenerationDuration() {
    const durations = Array.from(this.#managedCameras.values())
      .map((camera) => camera.imageCapture.getLastTimelapseGenerationDuration())
      .filter((duration): duration is number => duration !== null);

    if (durations.length === 0) {
      return null;
    }

    return Math.max(...durations);
  }

  async clearAllImagesAsync(cameraId: number): Promise<boolean> {
    return this.#managedCameras.get(cameraId)?.imageCapture.clearAllImagesAsync() ?? false;
  }

  regenerateTimelapseArchiveAsync(cameraId: number) {
    return this.#managedCameras.get(cameraId)?.imageCapture.regenerateTimelapseArchiveAsync(false);
  }

  async fetchStreamAsync(cameraId: number): Promise<Response | null> {
    const camera = this.#managedCameras.get(cameraId);
    if (!camera?.settings.enabled || camera.settings.streamUrl.trim() === "") {
      return null;
    }

    return fetch(camera.settings.streamUrl, {
      method: "GET",
    });
  }

  async fetchHealthAsync(cameraId: number): Promise<Response | null> {
    const camera = this.#managedCameras.get(cameraId);
    if (!camera || camera.settings.healthUrl.trim() === "") {
      return null;
    }

    return fetch(camera.settings.healthUrl, {
      method: "GET",
    });
  }

  async addCameraSettingsAsync(
    cameraSettings: Omit<SDBCameraSettings, "id">,
  ): Promise<SDBCameraSettings> {
    const id = await this.#cameraRepository.addAsync(cameraSettings);
    await this.#eventBus.publishAsync(new CameraSettingsModifiedEvent({}));
    return {
      ...cameraSettings,
      id,
    };
  }

  async updateCameraSettingsAsync(
    newSettings: SDBCameraSettings,
  ): Promise<SDBCameraSettings | null> {
    const existingSettings = await this.#cameraRepository.getByIdAsync(newSettings.id);
    if (!existingSettings) {
      return null;
    }

    await this.#cameraRepository.updateAsync(newSettings);
    await this.#eventBus.publishAsync(new CameraSettingsModifiedEvent({}));
    return newSettings;
  }

  async deleteCameraSettingsAsync(cameraId: number): Promise<boolean> {
    const existingSettings = await this.#cameraRepository.getByIdAsync(cameraId);
    if (!existingSettings) {
      return false;
    }

    await this.#cameraRepository.deleteAsync(cameraId);
    await this.#eventBus.publishAsync(new CameraSettingsModifiedEvent({}));
    return true;
  }

  async regenerateAsync(): Promise<this> {
    if (this.#isUpdating) {
      this.#logger.warn("CameraManager is already updating, skipping regenerateAsync call.");
      return this;
    }
    if (this.#disposed) {
      return this;
    }
    this.#isUpdating = true;
    try {
      const settings = await this.#cameraRepository.getAllAsync();
      const previousCameras = this.#managedCameras;
      const nextCameras = new Map<number, ManagedCamera>();

      for (const cameraSettings of settings) {
        const existingCamera = previousCameras.get(cameraSettings.id);
        const imageCapture =
          existingCamera?.imageCapture ??
          new ImageCapture(
            cameraSettings.id,
            async (fileName: string, directory: string) => {
              const latestSettings = this.#managedCameras.get(cameraSettings.id)?.settings;
              const latestImageCapture = this.#managedCameras.get(cameraSettings.id)?.imageCapture;
              if (
                !latestSettings?.enabled ||
                !latestImageCapture ||
                latestSettings.captureUrl.trim() === ""
              ) {
                return;
              }

              await latestImageCapture.captureImageAsync(
                fileName,
                latestSettings.captureUrl,
                {},
                directory,
              );
            },
            this.#archiveQueue.enqueue.bind(this.#archiveQueue),
            this.#logger,
            this.#timeExpressionResolver,
          );

        imageCapture.updateTimelapseSettings(cameraSettings);
        nextCameras.set(cameraSettings.id, {
          settings: cameraSettings,
          imageCapture,
        });
      }

      for (const [cameraId, managedCamera] of previousCameras.entries()) {
        if (!nextCameras.has(cameraId)) {
          managedCamera.imageCapture[Symbol.dispose]();
        }
      }

      this.#managedCameras = nextCameras;
      await this.refreshEnabledCamerasAsync();
    } finally {
      this.#isUpdating = false;
    }
    return this;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.#disposed = true;
    this.#listenerCleanupFunction();
    await this.#imageCaptureCronJob.stop();

    for (const managedCamera of this.#managedCameras.values()) {
      managedCamera.imageCapture[Symbol.dispose]();
    }
    this.#managedCameras.clear();
  }

  private async refreshEnabledCamerasAsync(): Promise<void> {
    for (const { settings, imageCapture } of this.#managedCameras.values()) {
      if (!settings.enabled) {
        continue;
      }

      if (settings.captureUrl.trim() !== "") {
        await imageCapture.captureLatestImageAsync(settings.captureUrl, {});
      }
      await imageCapture.runImageRetentionAsync(
        settings.imageRetentionSize,
        settings.imageRetentionDays,
      );
      await imageCapture.regenerateTimelapseArchiveAsync(true);
    }
  }
}

export { CameraManager };
