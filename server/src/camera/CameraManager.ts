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
  #activeStreams: Set<AbortController> = new Set();
  #disposed: boolean = false;
  readonly #baseUrl: string = "http://localhost:3002";

  constructor(sprootDB: ISprootDB, interserviceAuthenticationKey: string, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#interserviceAuthenticationKey = interserviceAuthenticationKey;
    this.#logger = logger;
    new CronJob(
      CRON.EVERY_MINUTE,
      async () => {
        if (this.#picameraServerProcess !== null) {
          try {
            await this.captureImageAsync("latest.jpg");
          } catch (e) {
            this.#logger.error(`Cron error while capturing image: ${e}`);
          }
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

  async initializeOrRegenerateAsync(): Promise<void> {
    if (this.#disposed) {
      return;
    }
    const settings = await this.#sprootDB.getCameraSettingsAsync();

    if (settings.length != 0) {
      const cameraSettings = settings[0];
      // Kill existing process if the settings have changed
      if (!this.areSameSettings(cameraSettings)) {
        this.cleanupLivestream();
      }
      this.#currentSettings = cameraSettings!;

      // If there is no live stream process, create one.
      if (this.#picameraServerProcess == null) {
        this.#picameraServerProcess = spawn("python3", [
          "python/pi_camera_server.py",
          "--resolution",
          `${cameraSettings!.xVideoResolution}x${cameraSettings!.yVideoResolution}`,
        ]);

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
          if (signal === "SIGINT") {
            this.dispose();
            return;
          }
          this.cleanupLivestream();
          this.#picameraServerProcess = null;
        });
      }
    } else {
      this.cleanupLivestream();
    }
  }

  async captureImageAsync(fileName: string) {
    const response = await fetch(`${this.#baseUrl}/capture`, {
      method: "GET",
      headers: this.generateRequestHeaders(),
    });
    if (!response.ok || !response.body) {
      this.#logger.error(
        `Image capture was unsuccessful. Filename: ${IMAGE_DIRECTORY}/${fileName}`,
      );
      return;
    }
    // Ensure the directory exists
    await fs.promises.mkdir(IMAGE_DIRECTORY, { recursive: true });

    const outputPath = path.join(IMAGE_DIRECTORY, fileName);
    await streamPipeline(Readable.fromWeb(response.body), createWriteStream(outputPath));

    this.#logger.info(`Image captured. Filename: ${IMAGE_DIRECTORY}/${fileName}`);
  }

  async forwardLivestreamAsync(writeableStream: NodeJS.WritableStream): Promise<AbortController> {
    const abortController = new AbortController();

    this.#activeStreams.add(abortController);
    abortController.signal.addEventListener("abort", () =>
      this.#activeStreams.delete(abortController),
    );

    // Setup signal handlers for graceful termination
    process
      .once("SIGTERM", () => {
        abortController.abort();
      })
      .once("SIGINT", () => {
        abortController.abort();
      });
    writeableStream
      .on("close", () => {
        abortController.abort();
      })
      .on("error", () => {
        abortController.abort();
      });

    const upstream = await fetch(`${this.#baseUrl}/stream.mjpg`, {
      method: "GET",
      headers: this.generateRequestHeaders(),
      signal: abortController.signal,
    });

    if (!upstream.ok || !upstream.body) {
      this.#logger.error("Failed to connect to camera stream");
      throw new Error("Failed to connect to camera stream");
    }
    const readableStream = Readable.fromWeb(upstream.body);

    readableStream.on("error", (err) => {
      if (!err.message.includes("abort")) {
        this.#logger.error(`Upstream stream error: ${err.message}`);
      }
    });
    readableStream.pipe(writeableStream);

    return abortController;
  }

  async getLatestImageAsync(): Promise<Buffer | null> {
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

      // Sort files by timestamp, newest first.
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(IMAGE_DIRECTORY, file);
          const stats = await fs.promises.stat(filePath);
          return { file, stats };
        }),
      );
      fileStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Load latest image
      const latestFilePath = path.join(IMAGE_DIRECTORY, fileStats[0]!.file);
      const imageBuffer = await fs.promises.readFile(latestFilePath);

      return imageBuffer;
    } catch (error) {
      this.#logger.error(`Error retrieving latest image: ${error}`);
      return null;
    }
  }

  dispose(): void {
    this.#disposed = true;
    this.cleanupLivestream();
  }

  /**
   * Cleans up the live stream. Removes listeners and kills the process,
   * setting the livestreamProcess to null if successful.
   */
  private cleanupLivestream() {
    // Cleanup active streams - calling abort should also delete them from
    // the active stream set
    for (const controller of this.#activeStreams) {
      controller.abort();
    }

    if (this.#picameraServerProcess !== null) {
      this.#picameraServerProcess.removeAllListeners();
      this.#picameraServerProcess.stderr.removeAllListeners();
      this.#picameraServerProcess.stdout.removeAllListeners();
      const result = this.#picameraServerProcess.kill();
      if (result == true) {
        this.#picameraServerProcess = null;
      }
    }
  }

  private areSameSettings(newSettings?: SDBCameraSettings) {
    if (!this.#currentSettings || newSettings == undefined) {
      return false;
    }

    return (
      this.#currentSettings.id === newSettings.id &&
      this.#currentSettings.xVideoResolution === newSettings.xVideoResolution &&
      this.#currentSettings.yVideoResolution === newSettings.yVideoResolution &&
      this.#currentSettings.xImageResolution === newSettings.xImageResolution &&
      this.#currentSettings.yImageResolution === newSettings.yImageResolution
    );
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
