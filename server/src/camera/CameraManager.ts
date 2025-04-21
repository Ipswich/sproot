import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { generateInterserviceAuthenticationToken } from "@sproot/sproot-common/dist/utility/InterserviceAuthentication";
import { IMAGE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs, { createWriteStream } from "fs";
import { pipeline, Readable } from "stream";
import { promisify } from "util";

import winston from "winston";
import path from "path";

const streamPipeline = promisify(pipeline);

class CameraManager {
  #sprootDB: ISprootDB;
  #interserviceAuthenticationKey: string;
  #logger: winston.Logger;
  #picameraServerProcess: ChildProcessWithoutNullStreams | null = null;
  #currentSettings: SDBCameraSettings | null = null;
  readonly #baseUrl: string = "http://localhost:3002";

  constructor(sprootDB: ISprootDB, interserviceAuthenticationKey: string, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#interserviceAuthenticationKey = interserviceAuthenticationKey;
    this.#logger = logger;
  }

  async initializeOrRegenerateAsync(): Promise<void> {
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
          this.#logger.error(`Message from Picamera Server: ${data}`);
        });

        this.#picameraServerProcess.on("close", (code, signal) => {
          this.#logger.info(
            `Picamera server exited with status: ${code ?? signal ?? "Unknown exit condition!"}`,
          );
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

  async forwardLivestreamAsync(writeableStream: NodeJS.WritableStream) {
    const upstream = await fetch(`${this.#baseUrl}/stream.mjpg`, {
      method: "GET",
      headers: this.generateRequestHeaders(),
    });

    if (!upstream.ok || !upstream.body) {
      this.#logger.error("Failed to connect to camera stream");
      throw new Error("Failed to connect to camera stream");
    }

    Readable.fromWeb(upstream.body).pipe(writeableStream);
  }

  dispose(): void {
    this.cleanupLivestream();
  }

  /**
   * Cleans up the live stream. Removes listeners and kills the process,
   * setting the livestreamProcess to null if successful.
   */
  private cleanupLivestream() {
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
