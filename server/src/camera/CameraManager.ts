import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { generateInterserviceAuthenticationToken } from "@sproot/sproot-common/dist/utility/InterserviceAuthentication";
import { CRON, TIMELAPSE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { CronJob } from "cron";

import winston from "winston";
import ImageCapture from "./ImageCapture";
import StreamProxy from "./StreamProxy";

class CameraManager {
  #sprootDB: ISprootDB;
  #interserviceAuthenticationKey: string;
  #logger: winston.Logger;

  #imageCapture: ImageCapture;
  #streamProxy: StreamProxy | null = null;
  #picameraServerProcess: ChildProcessWithoutNullStreams | null = null;
  #currentSettings: SDBCameraSettings | null = null;
  #isUpdating: boolean = false;

  #imageCaptureCronJob: CronJob;

  #disposed: boolean = false;
  readonly #baseUrl: string = "http://localhost:3002";

  static createInstanceAsync(
    sprootDB: ISprootDB,
    interserviceAuthenticationKey: string,
    logger: winston.Logger,
  ): Promise<CameraManager> {
    const cameraManager = new CameraManager(sprootDB, interserviceAuthenticationKey, logger);
    return cameraManager.regenerateAsync();
  }

  private constructor(
    sprootDB: ISprootDB,
    interserviceAuthenticationKey: string,
    logger: winston.Logger,
  ) {
    this.#sprootDB = sprootDB;
    this.#interserviceAuthenticationKey = interserviceAuthenticationKey;
    this.#logger = logger;
    this.#imageCapture = new ImageCapture(logger);
    this.#imageCaptureCronJob = new CronJob(
      CRON.EVERY_MINUTE,
      async () => {
        if (this.#picameraServerProcess !== null) {
          await this.#imageCapture.captureImageAsync(
            "latest.jpg",
            this.#baseUrl,
            this.generateRequestHeaders(),
          );
        }
      },
      undefined, // onComplete
      true, // start
      undefined, // timezone
      null, // context
      true, // runOnInit
      undefined, // utcOffset
      undefined, // unrefTimeout
      undefined, // waitForCompletion
      (err: unknown) => this.#logger.error(`Image capture cron error: ${err}`),
    );
  }

  get cameraSettings() {
    return this.#currentSettings;
  }

  /**
   * Gets a buffer containing the latest image.
   * @returns A promise that resolves to the latest image captured by the camera.
   */
  getLatestImageAsync() {
    return this.#imageCapture.getLatestImageAsync();
  }

  /**
   * Gets the progress of the timelapse archive generation.
   * @returns An object containing the status of the timelapse generation.
   */
  getTimelapseArchiveProgress() {
    return this.#imageCapture.getTimelapseGenerationStatus();
  }

  /**
   * Gets a buffer containing the timelapse archive.
   * @returns A promise that resolves with read stream to the timelapse archive.
   */
  getTimelapseArchiveAsync() {
    return this.#imageCapture.getTimelapseArchiveAsync();
  }

  getTimelapseImageCount() {
    return this.#imageCapture.getTimelapseImageCount();
  }

  getTimelapseArchiveSizeAsync() {
    return this.#imageCapture.getTimelapseArchiveSizeAsync();
  }

  getLastTimelapseGenerationDuration() {
    if (this.#currentSettings?.timelapseEnabled) {
      return this.#imageCapture.getLastTimelapseGenerationDuration();
    }
    return null;
  }

  /**
   * Clears all images from the timelapse directory.
   * @returns A promise that resolves to a boolean indicating whether the images were successfully cleared.
   */
  async clearAllImagesAsync(): Promise<boolean> {
    return this.#imageCapture.clearAllImagesAsync(TIMELAPSE_DIRECTORY);
  }

  /**
   * Regenerates the timelapse archive.
   * @returns A promise that resolves when the timelapse archive has been regenerated.
   */
  regenerateTimelapseArchiveAsync() {
    // Force regeneration - this ignores the time checks
    return this.#imageCapture.regenerateTimelapseArchiveAsync(false);
  }

  /**
   * Forces a reconnect to the upstream camera server.
   * @returns A promise that resolves with the result of the reconnection attempt.
   */
  reconnectLivestreamAsync() {
    if (!this.#streamProxy) {
      this.#logger.warn("CameraManager: stream proxy not initialized");
      return Promise.resolve(false);
    }
    return this.#streamProxy.reconnectAsync();
  }

  /**
   * Gets the frame buffer for direct access (used by streaming handlers).
   * @returns The frame buffer, or null if stream proxy is not initialized.
   */
  getFrameBuffer() {
    return this.#streamProxy?.getFrameBuffer() ?? null;
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
      const settings = await this.#sprootDB.getCameraSettingsAsync();

      if (settings[0] != undefined) {
        this.#currentSettings = settings[0];
        if (this.#currentSettings.enabled) {
          // Don't await these here - internally, they keeps track if they're running
          // so this should prevent it from blocking until its done.
          this.#imageCapture
            .runImageRetentionAsync(
              this.#currentSettings.imageRetentionSize,
              this.#currentSettings.imageRetentionDays,
            )
            .then(() => {
              this.#imageCapture.regenerateTimelapseArchiveAsync();
            });
          this.createCameraProcess(this.#currentSettings);

          // Start stream proxy if not already running
          if (!this.#streamProxy) {
            this.#logger.info("CameraManager: creating new stream proxy");
            const streamProxy = new StreamProxy({
              logger: this.#logger,
              upstreamUrl: this.#baseUrl,
              upstreamHeaders: this.generateRequestHeaders.bind(this),
            });
            const streamProxyStarted = await streamProxy.startAsync();
            if (streamProxyStarted) {
              this.#streamProxy = streamProxy;
              this.#logger.info("CameraManager: stream proxy created");
            } else {
              this.#logger.warn("CameraManager: stream proxy failed to connect to upstream");
            }
          }

          this.#imageCapture.updateTimelapseSettings(this.#currentSettings);

          return this;
        }
      }

      // Camera disabled - stop stream proxy
      if (this.#streamProxy) {
        await this.#streamProxy.stopAsync();
        this.#streamProxy = null;
      }
    } finally {
      this.#isUpdating = false;
    }
    return this;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.#disposed = true;
    await this.#imageCaptureCronJob.stop();
    if (this.#streamProxy) {
      await this.#streamProxy.stopAsync();
      this.#streamProxy = null;
    }
    this.cleanupCameraProcess();
  }

  private createCameraProcess(cameraSettings: SDBCameraSettings) {
    // Kill existing process if the settings have changed
    if (!this.areSameDeviceSettings(cameraSettings)) {
      this.cleanupCameraProcess();
    }

    // If there is no live stream process, create one.
    if (this.#picameraServerProcess == null) {
      const cameraArguments = ["python/pi_camera_server.py"];
      if (cameraSettings.xImageResolution && cameraSettings.yImageResolution) {
        cameraArguments.push("--imageResolution");
        cameraArguments.push(
          `${cameraSettings.xImageResolution}x${cameraSettings.yImageResolution}`,
        );
      }
      if (cameraSettings.xVideoResolution && cameraSettings.yVideoResolution) {
        cameraArguments.push("--videoResolution");
        cameraArguments.push(
          `${cameraSettings.xVideoResolution}x${cameraSettings.yVideoResolution}`,
        );
      }
      if (cameraSettings.videoFps) {
        cameraArguments.push("--fps");
        cameraArguments.push(`${cameraSettings.videoFps}`);
      }

      this.#picameraServerProcess = spawn("python3", cameraArguments);

      this.#picameraServerProcess.on("spawn", () => {
        this.#logger.info(`Picamera server started`);
      });

      this.#picameraServerProcess.on("error", (error: Error) => {
        this.#logger.error(`Error on spawning Picamera Server: ${error}`);
        this.cleanupCameraProcess();
        this.#picameraServerProcess = null;
      });

      this.#picameraServerProcess.stdout.on("data", (data: string) => {
        this.#logger.info(`Message from Picamera Server: ${data}`);
      });

      this.#picameraServerProcess.stderr.on("data", (data: string) => {
        this.#logger.info(`Message from Picamera Server: ${data}`);
        // Check for bad address error
        if (data.includes("Bad address") || data.includes("OSError")) {
          this.#logger.error("Camera encoder error detected, attempting recovery");
          this.cleanupCameraProcess();
        }
        if (data.includes("timed out")) {
          this.#logger.error("Camera encoder timed out, attempting recovery");
          this.cleanupCameraProcess();
        }
      });

      this.#picameraServerProcess.on("close", async (code, signal) => {
        this.#logger.info(
          `Picamera server exited with status: ${code ?? signal ?? "Unknown exit condition!"}`,
        );
        //SIGINT should basically only come from a ctrl-c, everything is dying at this point
        if (signal === "SIGINT") {
          await this[Symbol.asyncDispose]();
          return;
        }
        this.cleanupCameraProcess();
      });
    }
  }

  private cleanupCameraProcess() {
    // Clean up process
    if (this.#picameraServerProcess !== null) {
      this.#picameraServerProcess.removeAllListeners();
      this.#picameraServerProcess.stderr.removeAllListeners();
      this.#picameraServerProcess.stdout.removeAllListeners();
      const result = this.#picameraServerProcess.kill();
      if (result === true) {
        this.#picameraServerProcess = null;
      }
    }
  }

  private areSameDeviceSettings(newSettings?: SDBCameraSettings) {
    if (!this.#currentSettings || newSettings == undefined) {
      return false;
    }

    return (
      this.#currentSettings.id === newSettings.id &&
      this.#currentSettings.xVideoResolution === newSettings.xVideoResolution &&
      this.#currentSettings.yVideoResolution === newSettings.yVideoResolution &&
      this.#currentSettings.videoFps === newSettings.videoFps &&
      this.#currentSettings.xImageResolution === newSettings.xImageResolution &&
      this.#currentSettings.yImageResolution === newSettings.yImageResolution
    );
  }

  private generateRequestHeaders(): Record<string, string> {
    return {
      "X-Interservice-Authentication-Token": generateInterserviceAuthenticationToken(
        this.#interserviceAuthenticationKey,
      ),
    };
  }
}

export { CameraManager };
