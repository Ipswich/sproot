import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { generateInterserviceAuthenticationToken } from "@sproot/sproot-common/dist/utility/InterserviceAuthentication";
import { CRON, IMAGE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs, { createWriteStream } from "fs";
import { pipeline, Readable } from "stream";
import { promisify } from "util";
import { CronJob } from "cron";

import winston from "winston";
import path from "path";

const streamPipeline = promisify(pipeline);

class CameraManager {
  #sprootDB: ISprootDB;
  #interserviceAuthenticationKey: string;
  #logger: winston.Logger;
  #picameraServerProcess: ChildProcessWithoutNullStreams | null = null;
  #currentSettings: SDBCameraSettings | null = null;
  #livestreamStream: NodeJS.ReadableStream | null = null;
  #livestreamAbortController: AbortController | null = null;
  #disposed: boolean = false;
  readonly #baseUrl: string = "http://localhost:3002";
  #reconnectTimeoutRef: NodeJS.Timeout | null = null;

  constructor(sprootDB: ISprootDB, interserviceAuthenticationKey: string, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#interserviceAuthenticationKey = interserviceAuthenticationKey;
    this.#logger = logger;
    new CronJob(
      CRON.EVERY_MINUTE,
      async () => {
        if (this.#picameraServerProcess !== null) {
          await this.captureImageAsync("latest.jpg");
        }
      },
      undefined, // onComplete
      true, // start
      undefined, // timezone
      null, // context
      true, // runOnInit
      undefined, // unrefTimeout
      undefined, // startDate
      undefined, // endDate
      (err) => this.#logger.error(`Image capture cron error: ${err}`),
    );
  }

  get livestream() {
    return this.#livestreamStream;
  }

  async initializeOrRegenerateAsync(): Promise<void> {
    if (this.#disposed) {
      return;
    }
    const settings = await this.#sprootDB.getCameraSettingsAsync();

    if (settings.length != 0) {
      const cameraSettings = settings[0];
      // Kill existing process if the settings have changed
      if (!this.areSameDeviceSettings(cameraSettings)) {
        this.cleanupLivestream();
      }
      this.#currentSettings = cameraSettings!;

      // If there is no live stream process, create one.
      if (this.#picameraServerProcess == null) {
        const cameraArguments = ["python/pi_camera_server.py"];
        if (cameraSettings?.xImageResolution && cameraSettings.yImageResolution) {
          cameraArguments.push("--imageResolution");
          cameraArguments.push(
            `${cameraSettings.xImageResolution}x${cameraSettings.yImageResolution}`,
          );
        }
        if (cameraSettings?.xVideoResolution && cameraSettings.yVideoResolution) {
          cameraArguments.push("--videoResolution");
          cameraArguments.push(
            `${cameraSettings.xVideoResolution}x${cameraSettings.yVideoResolution}`,
          );
        }
        if (cameraSettings?.videoFps) {
          cameraArguments.push("--fps");
          cameraArguments.push(`${cameraSettings.videoFps}`);
        }

        this.#picameraServerProcess = spawn("python3", cameraArguments);

        this.#picameraServerProcess.on("spawn", () => {
          this.#logger.info(`Picamera server started`);
        });

        this.#picameraServerProcess.on("error", (error: Error) => {
          this.#logger.error(`Error on spawning Picamera Server: ${error}`);
          this.cleanupLivestream();
          this.#picameraServerProcess = null;
        });

        this.#picameraServerProcess.stderr.on("data", (data: string) => {
          this.#logger.info(`Message from Picamera Server: ${data}`);
          // Check for bad address error
          if (data.includes("Bad address") || data.includes("OSError")) {
            this.#logger.error("Camera encoder error detected, attempting recovery");
            this.cleanupLivestream();
          }
        });

        this.#picameraServerProcess.on("close", (code, signal) => {
          this.#logger.info(
            `Picamera server exited with status: ${code ?? signal ?? "Unknown exit condition!"}`,
          );
          //SIGINT should basically only come from a ctrl-c, everything is dying at this point
          if (signal === "SIGINT") {
            this.dispose();
            return;
          }
          this.cleanupLivestream();
        });
      }

      if (this.#livestreamStream === null) {
        await this.connectToLivestreamAsync();
      }

      await this.runImageRetentionAsync();
    } else {
      this.cleanupLivestream();
    }
  }

  async captureImageAsync(fileName: string) {
    if (this.#disposed) {
      return;
    }
    let response: Response;
    try {
      response = await fetch(`${this.#baseUrl}/capture`, {
        method: "GET",
        headers: this.generateRequestHeaders(),
      });
      if (!response?.ok || !response.body) {
        this.#logger.error(
          `Image capture was unsuccessful(status: ${response?.status}).. Filename: ${IMAGE_DIRECTORY}/${fileName}`,
        );
        return;
      }
      // Ensure the directory exists
      await fs.promises.mkdir(IMAGE_DIRECTORY, { recursive: true });

      const outputPath = path.join(IMAGE_DIRECTORY, fileName);
      await streamPipeline(Readable.fromWeb(response.body), createWriteStream(outputPath));

      this.#logger.info(`Image captured. Filename: ${IMAGE_DIRECTORY}/${fileName}`);
    } catch (e) {
      this.#logger.error(
        `Image capture failed for ${IMAGE_DIRECTORY}/${fileName}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return;
    }
  }

  async getLatestImageAsync(): Promise<Buffer | null> {
    const imagePath = await this.getSortedImageAsync(
      (a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime(),
    );
    if (imagePath) {
      return fs.promises.readFile(imagePath);
    }
    return null;
  }

  dispose(): void {
    this.#disposed = true;
    this.cleanupLivestream();
  }

  private async getOldestImagePathAsync(): Promise<string | null> {
    return await this.getSortedImageAsync(
      (a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime(),
    );
  }

  /**
   * Manages images based on retention settings by removing old images
   * when either space limit or time retention period is exceeded
   */
  private async runImageRetentionAsync(
    directory = IMAGE_DIRECTORY,
    now = new Date(),
  ): Promise<void> {
    // Ensure the directory exists
    if (!fs.existsSync(directory)) {
      this.#logger.warn(`Image directory ${directory} does not exist`);
      return;
    }

    // Get retention settings from current camera settings
    const maxRetentionSizeMB = this.#currentSettings?.imageRetentionSize ?? Infinity;
    const retentionPeriodInMS =
      (this.#currentSettings?.imageRetentionDays || 0) * 24 * 60 * 60 * 1000;
    const cutoffTime = now.getTime() - retentionPeriodInMS;
    let directorySizeMB = (await this.getDirectorySizeAsync(directory)) / (1024 * 1024);

    // Process files until we're within limits
    let oldestFilePath = await this.getOldestImagePathAsync();

    while (oldestFilePath) {
      // Get stats for the oldest file
      const stats = await fs.promises.stat(oldestFilePath);
      const oldestFileTime = stats.mtime.getTime();
      const fileSizeMB = stats.size / (1024 * 1024);

      // Check if we need to delete this file
      const oversizedStorage = directorySizeMB > maxRetentionSizeMB;
      const exceededRetentionPeriod = retentionPeriodInMS > 0 && oldestFileTime < cutoffTime;

      if (!oversizedStorage && !exceededRetentionPeriod) {
        break; // Stop if we're within all limits
      }

      // Delete the file
      await fs.promises.rm(oldestFilePath);
      this.#logger.debug(`Removed old image: ${oldestFilePath}`);

      directorySizeMB -= fileSizeMB;

      // Update for next iteration
      oldestFilePath = await this.getOldestImagePathAsync();
    }
  }

  /**
   * Gets the total size of a directory's contents in bytes
   */
  private async getDirectorySizeAsync(directoryPath: string): Promise<number> {
    // Ensure the directory exists
    if (!fs.existsSync(directoryPath)) {
      return 0;
    }

    let totalSize = 0;
    const items = await fs.promises.readdir(directoryPath);

    // Process each item (file or subdirectory)
    for (const item of items) {
      const itemPath = path.join(directoryPath, item);
      const stats = await fs.promises.stat(itemPath);

      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        totalSize += await this.getDirectorySizeAsync(itemPath);
      }
    }

    return totalSize;
  }

  private async connectToLivestreamAsync() {
    this.disconnectFromLivestream();

    this.#livestreamAbortController = new AbortController();
    try {
      const upstream = await fetch(`${this.#baseUrl}/stream.mjpg`, {
        method: "GET",
        headers: this.generateRequestHeaders(),
        signal: this.#livestreamAbortController.signal,
      });

      // Return if not a successful result
      if (!upstream.ok || !upstream.body) {
        return;
      }

      this.#livestreamStream = Readable.fromWeb(upstream.body);
      // reconnect every 6 hours - long lived http connections can be unreliable
      this.#reconnectTimeoutRef = setTimeout(
        async () => {
          await this.reconnectLivestreamAsync();
        },
        60 * 1000 * 60 * 6,
      );
      this.#logger.info(`Successfully connected to upstream livestream`);

      this.#livestreamStream.on("error", (e) => {
        this.#logger.error(`Upstream stream error: ${e instanceof Error ? e.message : String(e)}`);
        // Safely clean up without triggering additional errors
        try {
          this.#livestreamStream?.emit("end");
        } catch (e) {
          this.#logger.debug(
            `Error during stream cleanup: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
        this.disconnectFromLivestream();
      });
    } catch (e) {
      this.#logger.error(
        `Error connecting camera to upstream livestream: ${e instanceof Error ? e.message : String(e)}`,
      );
      this.disconnectFromLivestream();
    }
  }

  /**
   * Reconnects the livestream.
   * @returns {Promise<boolean>} True if reconnected successfully, false otherwise
   */
  private async reconnectLivestreamAsync(): Promise<boolean> {
    if (this.#disposed) {
      return false;
    }

    this.#logger.info("Reconnecting livestream...");
    this.disconnectFromLivestream();

    try {
      await this.connectToLivestreamAsync();
      return this.#livestreamStream !== null;
    } catch (e) {
      this.#logger.error(
        `Failed to reconnect livestream: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }

  private disconnectFromLivestream() {
    if (this.#livestreamAbortController) {
      this.#livestreamAbortController.abort();
      this.#livestreamAbortController = null;
    }
    if (this.#livestreamStream) {
      this.#livestreamStream.removeAllListeners();
      this.#livestreamStream = null;
    }
    if (this.#reconnectTimeoutRef) {
      clearTimeout(this.#reconnectTimeoutRef);
      this.#reconnectTimeoutRef = null;
    }
  }

  /**
   * Cleans up the live stream. Removes listeners and kills the process,
   * setting the livestreamProcess to null if successful.
   */
  private cleanupLivestream() {
    // Clean up timelapse
    if (this.#timelapse) {
      this.#timelapse.dispose();
      this.#timelapse = null;
    }

    this.disconnectFromLivestream();

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

  private async getSortedImageAsync(
    sort: (
      a: {
        file: string;
        stats: fs.Stats;
      },
      b: {
        file: string;
        stats: fs.Stats;
      },
    ) => number,
  ) {
    try {
      // Ensure the directory exists
      if (!fs.existsSync(IMAGE_DIRECTORY)) {
        this.#logger.warn(`Image directory ${IMAGE_DIRECTORY} does not exist`);
        return null;
      }

      // Get all files in the directory
      const files = await fs.promises.readdir(IMAGE_DIRECTORY);

      if (files.length === 0) {
        this.#logger.warn(`No images found in ${IMAGE_DIRECTORY}`);
        return null;
      }

      // Sort files
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(IMAGE_DIRECTORY, file);
          const stats = await fs.promises.stat(filePath);
          return { file, stats };
        }),
      );
      fileStats.sort(sort);

      // Load image
      const imagePath = path.join(IMAGE_DIRECTORY, fileStats[0]!.file);

      return imagePath;
    } catch (error) {
      this.#logger.error(`Error retrieving image: ${error}`);
      return null;
    }
  }

  private generateRequestHeaders() {
    return {
      "X-Interservice-Authentication-Token": generateInterserviceAuthenticationToken(
        this.#interserviceAuthenticationKey,
      ),
    };
  }
}

export { CameraManager };
