import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import winston from "winston";

class CameraManager {
  #sprootDB: ISprootDB;
  #logger: winston.Logger;
  #livestreamProcess: ChildProcessWithoutNullStreams | null = null;

  constructor(sprootDB: ISprootDB, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#logger = logger;
  }

  async initializeOrRegenerateAsync(): Promise<void> {
    const settings = await this.#sprootDB.getCameraSettingsAsync();

    if (settings.length != 0) {
      if (this.#livestreamProcess == null) {
        // const cameraSettings = settings[0];
        this.#livestreamProcess = spawn("python3", [
          "python/livestream_server.py",
          // String(cameraSettings?.xVideoResolution),
          // String(cameraSettings?.yVideoResolution),
          // String(cameraSettings?.xImageResolution),
          // String(cameraSettings?.yImageResolution),
        ]);

        this.#livestreamProcess.on("spawn", () => {
          this.#logger.info(`Livestream server started`);
        });

        this.#livestreamProcess.on("exited", (code, signal) => {
          this.#logger.info(
            `Livestream server exited with status: ${code ?? signal ?? "Unknown exit condition!"}`,
          );
          this.cleanupLivestream();
          this.#livestreamProcess = null;
        });

        this.#livestreamProcess.on("error", (error: Error) => {
          this.#logger.error(`Error on spawning livestream server: ${error}`);
          this.cleanupLivestream();
          this.#livestreamProcess = null;
        });

        this.#livestreamProcess.stdout.on("data", (data) => {
          this.#logger.info(`STDOUT: ${data}`);
        });

        this.#livestreamProcess.stderr.on("error", (error) => {
          this.#logger.error(`Error in livestream server: ${error}`);
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
}

export { CameraManager };
