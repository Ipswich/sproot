import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { generateInterserviceAuthenticationToken } from "@sproot/sproot-common/dist/utility/InterserviceAuthentication";
import { CRON } from "@sproot/sproot-common/dist/utility/Constants";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
// import fs from "fs";
import { CronJob } from "cron";

import winston from "winston";
// import path from "path";
import ImageCapture from "./ImageCapture";
import Livestream from "./Livestream";
// import { Timelapse } from "./Timelapse";

class CameraManager {
  #sprootDB: ISprootDB;
  #interserviceAuthenticationKey: string;
  #logger: winston.Logger;

  #imageCapture: ImageCapture;
  #livestream: Livestream;
  #picameraServerProcess: ChildProcessWithoutNullStreams | null = null;
  #currentSettings: SDBCameraSettings | null = null;
  // #timelapse: Timelapse | null = null;
  #disposed: boolean = false;
  readonly #baseUrl: string = "http://localhost:3002";

  constructor(sprootDB: ISprootDB, interserviceAuthenticationKey: string, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#interserviceAuthenticationKey = interserviceAuthenticationKey;
    this.#logger = logger;
    this.#imageCapture = new ImageCapture(logger);
    this.#livestream = new Livestream(logger);
    // this.#timelapse = null;
    new CronJob(
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
      undefined, // unrefTimeout
      undefined, // startDate
      undefined, // endDate
      (err) => this.#logger.error(`Image capture cron error: ${err}`),
    );
  }

  get livestream() {
    return this.#livestream.readableStream;
  }

  getLatestImageAsync() {
    return this.#imageCapture.getLatestImageAsync();
  }

  async initializeOrRegenerateAsync(): Promise<void> {
    if (this.#disposed) {
      return;
    }
    const settings = await this.#sprootDB.getCameraSettingsAsync();

    if (settings[0] != undefined) {
      this.createCameraProcess(settings[0]);
      this.#currentSettings = settings[0];

      if (this.#livestream.readableStream === null) {
        await this.#livestream.connectToLivestreamAsync(
          this.#baseUrl,
          this.generateRequestHeaders(),
        );
      }

      // if (this.#timelapse === null) {
      //   this.#timelapse = new Timelapse(async (filename: string, directory: string) => {
      //     const latestImage = await this.#imageCapture.getLatestImageAsync();
      //     if (latestImage) {
      //       await fs.promises.writeFile(path.join(directory, filename), latestImage);
      //     }
      //   }, this.#logger);
      // }

      // this.#timelapse.updateSettings(
      //   this.#currentSettings.name!,
      //   this.#currentSettings.timelapseEnabled!,
      //   this.#currentSettings.timelapseInterval!,
      // );

      await this.#imageCapture.runImageRetentionAsync(
        this.#currentSettings.imageRetentionSize,
        this.#currentSettings.imageRetentionDays,
      );
    } else {
      this.#livestream.disconnectFromLivestream();
    }
  }

  dispose(): void {
    this.#disposed = true;
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
        console.log(`Message from Picamera Server: ${data}`);
      });

      this.#picameraServerProcess.stderr.on("data", (data: string) => {
        this.#logger.info(`Message from Picamera Server: ${data}`);
        // Check for bad address error
        if (data.includes("Bad address") || data.includes("OSError")) {
          this.#logger.error("Camera encoder error detected, attempting recovery");
          this.cleanupCameraProcess();
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
        this.cleanupCameraProcess();
      });
    }
  }

  private cleanupCameraProcess() {
    this.#livestream.disconnectFromLivestream();
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
