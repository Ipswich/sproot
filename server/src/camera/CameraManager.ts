import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import winston from "winston";

class CameraManager {
  #sprootDB: ISprootDB;
  #logger: winston.Logger;
  #livestreamProcess: ChildProcessWithoutNullStreams | null = null;
  #currentSettings: SDBCameraSettings | null = null;

  constructor(sprootDB: ISprootDB, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
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

      // If there is no live stream process, create one.
      if (this.#livestreamProcess == null) {
        this.#livestreamProcess = spawn("python3", [
          "python/livestream_server.py",
          "--resolution",
          `${cameraSettings!.xVideoResolution}x${cameraSettings!.yVideoResolution}`,
        ]);

        this.#livestreamProcess.on("spawn", () => {
          this.#logger.info(`Livestream server started`);
        });

        this.#livestreamProcess.on("error", (error: Error) => {
          this.#logger.error(`Error on spawning livestream server: ${error}`);
          this.cleanupLivestream();
          this.#livestreamProcess = null;
        });

        this.#livestreamProcess.stderr.on("data", (data) => {
          this.#logger.error(`MAYBE AN ERROR: ${data}`);
        });

        this.#livestreamProcess.on("close", (code, signal) => {
          this.#logger.info(
            `Livestream server exited with status: ${code ?? signal ?? "Unknown exit condition!"}`,
          );
          this.cleanupLivestream();
          this.#livestreamProcess = null;
        });
      }
    } else {
      this.cleanupLivestream();
    }
  }

  async disposeAsync(): Promise<void> {
    this.cleanupLivestream();
  }

  /**
   * Cleans up the live stream. Removes listeners and kills the process,
   * setting the livestreamProcess to null if successful.
   */
  private cleanupLivestream() {
    if (this.#livestreamProcess !== null) {
      this.#livestreamProcess.removeAllListeners();
      this.#livestreamProcess.stderr.removeAllListeners();
      this.#livestreamProcess.stdout.removeAllListeners();
      const result = this.#livestreamProcess.kill();
      if (result == true) {
        this.#livestreamProcess = null;
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
}

export { CameraManager };
