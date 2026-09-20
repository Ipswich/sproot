import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import {
  CAMERA_LATEST_IMAGE_REFRESH_INTERVAL_SECONDS_DEFAULT,
  CAMERA_MAINTENANCE_INTERVAL_SECONDS,
  CRON,
} from "@sproot/common/utility/Constants";
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
  lastLatestImageRefreshAt: number | null;
};

class CameraManager {
  #eventBus: IEventBus;
  #cameraRepository: ICameraRepository;
  #logger: winston.Logger;
  #timeExpressionResolver: TimeExpressionResolver;
  #managedCameras = new Map<number, ManagedCamera>();
  #archiveQueue = new PromiseQueue();
  #isUpdating: boolean = false;
  #latestImageCronJob: CronJob;
  #cameraMaintenanceCronJob: CronJob;
  #isRefreshingLatestImages: boolean = false;
  #isRunningCameraMaintenance: boolean = false;
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
    this.#latestImageCronJob = new CronJob(
      CRON.EVERY_SECOND,
      async () => {
        await this.refreshLatestImagesAsync();
      },
      undefined,
      true,
      undefined,
      null,
      true,
      undefined,
      undefined,
      undefined,
      (err: unknown) => this.#logger.error(`Latest image cron error: ${err}`),
    );
    this.#cameraMaintenanceCronJob = new CronJob(
      `*/${CAMERA_MAINTENANCE_INTERVAL_SECONDS} * * * * *`,
      async () => {
        await this.runCameraMaintenanceAsync();
      },
      undefined,
      true,
      undefined,
      null,
      true,
      undefined,
      undefined,
      undefined,
      (err: unknown) => this.#logger.error(`Camera maintenance cron error: ${err}`),
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

  async captureLatestImageAsync(cameraId: number): Promise<Buffer | null> {
    const camera = this.#managedCameras.get(cameraId);
    if (!camera || camera.settings.captureUrl.trim() === "") {
      return null;
    }

    const captured = await camera.imageCapture.captureLatestImageAsync(
      camera.settings.captureUrl,
      {},
    );
    if (!captured) {
      return null;
    }

    return camera.imageCapture.getLatestImageAsync();
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
          lastLatestImageRefreshAt: existingCamera?.lastLatestImageRefreshAt ?? null,
        });
      }

      for (const [cameraId, managedCamera] of previousCameras.entries()) {
        if (!nextCameras.has(cameraId)) {
          managedCamera.imageCapture[Symbol.dispose]();
        }
      }

      this.#managedCameras = nextCameras;
      await this.refreshLatestImagesAsync(true);
      await this.runCameraMaintenanceAsync();
    } finally {
      this.#isUpdating = false;
    }
    return this;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.#disposed = true;
    this.#listenerCleanupFunction();
    await this.#latestImageCronJob.stop();
    await this.#cameraMaintenanceCronJob.stop();

    for (const managedCamera of this.#managedCameras.values()) {
      managedCamera.imageCapture[Symbol.dispose]();
    }
    this.#managedCameras.clear();
  }

  private async refreshLatestImagesAsync(force: boolean = false): Promise<void> {
    if (this.#isRefreshingLatestImages) {
      this.#logger.warn("Latest image refresh skipped: previous job still running.");
      return;
    }

    this.#isRefreshingLatestImages = true;
    try {
      const now = Date.now();
      const eligibleCameras = Array.from(this.#managedCameras.values()).filter(({ settings }) => {
        if (!settings.enabled || settings.captureUrl.trim() === "") {
          return false;
        }

        return force || this.shouldRefreshLatestImage(settings, now);
      });

      await Promise.all(
        eligibleCameras.map(async (managedCamera) => {
          await managedCamera.imageCapture.captureLatestImageAsync(
            managedCamera.settings.captureUrl,
            {},
          );
          managedCamera.lastLatestImageRefreshAt = now;
        }),
      );
    } finally {
      this.#isRefreshingLatestImages = false;
    }
  }

  private shouldRefreshLatestImage(settings: SDBCameraSettings, now: number): boolean {
    const lastRefresh = this.#managedCameras.get(settings.id)?.lastLatestImageRefreshAt;
    if (lastRefresh == null) {
      return true;
    }

    const intervalSeconds =
      settings.latestImageRefreshIntervalSeconds ??
      CAMERA_LATEST_IMAGE_REFRESH_INTERVAL_SECONDS_DEFAULT;
    return now - lastRefresh >= intervalSeconds * 1000;
  }

  private async runCameraMaintenanceAsync(): Promise<void> {
    if (this.#isRunningCameraMaintenance) {
      this.#logger.warn("Camera maintenance skipped: previous job still running.");
      return;
    }

    this.#isRunningCameraMaintenance = true;
    try {
      const enabledCameras = Array.from(this.#managedCameras.values()).filter(
        ({ settings }) => settings.enabled,
      );

      await Promise.all(
        enabledCameras.map(async ({ settings, imageCapture }) => {
          await imageCapture.runImageRetentionAsync(
            settings.imageRetentionSize,
            settings.imageRetentionDays,
          );
          await imageCapture.regenerateTimelapseArchiveAsync(true);
        }),
      );
    } finally {
      this.#isRunningCameraMaintenance = false;
    }
  }
}

export { CameraManager };
