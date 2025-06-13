import fs from "fs";
import winston from "winston";
import { Worker } from "worker_threads";
import {
  ARCHIVE_DIRECTORY,
  TIMELAPSE_DIRECTORY,
} from "@sproot/sproot-common/dist/utility/Constants";
import { SDBCameraSettings } from "@sproot/sproot-common/dist/database/SDBCameraSettings";
import { isBetweenTimeStamp } from "@sproot/sproot-common/dist/utility/TimeMethods";
import path from "path";

type AddImageToTimelapseFunction = (file: string, directory: string) => Promise<void>;

class Timelapse {
  #logger: winston.Logger;
  #intervalMinutes: number | null = null;
  #timer: NodeJS.Timeout | null = null;
  addImageToTimelapseFunction: AddImageToTimelapseFunction;
  #cameraName: string | null = null;
  #enabled: boolean = false;
  #startTime: string | null = null;
  #endTime: string | null = null;
  #isGeneratingTimelapseArchive: boolean = false;
  #archiveProgressPercentage: number = 0;

  constructor(addImageToTimelapseFunction: AddImageToTimelapseFunction, logger: winston.Logger) {
    this.addImageToTimelapseFunction = addImageToTimelapseFunction;
    this.#logger = logger;
  }

  updateSettings(settings: SDBCameraSettings): void {
    this.#cameraName = settings.name;
    this.#startTime = settings.timelapseStartTime;
    this.#endTime = settings.timelapseEndTime;

    if (this.#intervalMinutes !== settings.timelapseInterval) {
      this.#intervalMinutes = settings.timelapseInterval;
      if (this.#timer) {
        clearTimeout(this.#timer);
        this.#timer = null;
      }
      this.scheduleNextExecution();
    }

    if (this.#enabled && !settings.timelapseEnabled) {
      this.#enabled = false;
      this.stop();
    } else if (!this.#enabled && settings.timelapseEnabled) {
      this.#enabled = true;
      this.start();
    }
  }

  get isGeneratingTimelapseArchive(): boolean {
    return this.#isGeneratingTimelapseArchive;
  }

  get archiveProgress(): number {
    return this.#archiveProgressPercentage;
  }

  async getTimelapseArchiveAsync(): Promise<Buffer | null> {
    try {
      if (!fs.existsSync(ARCHIVE_DIRECTORY)) {
        return null;
      }

      const files = await fs.promises.readdir(ARCHIVE_DIRECTORY);
      if (!files.length) return null;

      const matchingFiles = files.filter((file) => file.match("timelapse.tar"));

      if (!matchingFiles.length) {
        return null;
      }

      const latestFile = path.join(ARCHIVE_DIRECTORY, matchingFiles[0]!);

      return await fs.promises.readFile(latestFile);
    } catch (error) {
      this.#logger.error(
        `Failed to get latest timelapse archive: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private start(): void {
    if (this.#intervalMinutes == null) {
      return;
    }
    this.scheduleNextExecution();

    this.#logger.info(
      `Timelapse started, adding image every ${this.#intervalMinutes} ${this.#intervalMinutes > 1 ? "minutes" : "minute"}`,
    );
  }

  private stop(): void {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#logger.info("Timelapse stopped");
  }

  private scheduleNextExecution(): void {
    if (!this.#enabled || this.#intervalMinutes == null) {
      return;
    }
    const intervalMs = this.#intervalMinutes * 60 * 1000;

    this.#timer = setTimeout(async () => {
      if (
        (this.#startTime === null && this.#endTime === null) ||
        isBetweenTimeStamp(this.#startTime, this.#endTime, new Date())
      ) {
        await this.addImage();
      }

      this.scheduleNextExecution();
    }, intervalMs);
  }

  private async addImage(): Promise<void> {
    try {
      // Create timestamp for unique filenames
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");

      const fileName = `${this.#cameraName}_${year}-${month}-${day}-${hours}-${minutes}.jpg`;

      await fs.promises.mkdir(TIMELAPSE_DIRECTORY, { recursive: true });

      await this.addImageToTimelapseFunction(fileName, TIMELAPSE_DIRECTORY);
      this.#logger.info(`Added timelapse image ${fileName} to ${TIMELAPSE_DIRECTORY}`);
    } catch (error) {
      this.#logger.error(
        `Failed to add timelapse image: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  public async generateTimelapseArchiveAsync(validateShouldRun: boolean): Promise<void> {
    if (validateShouldRun && !this.shouldGenerateTimelapseArchive()) {
      return;
    }
    if (this.#isGeneratingTimelapseArchive) {
      this.#logger.warn("Timelapse archive generation already in progress, skipping this run.");
      return;
    }
    this.#isGeneratingTimelapseArchive = true;
    this.#archiveProgressPercentage = 0;

    return new Promise<void>((resolve) => {
      // Create a worker thread
      const workerPath = path.resolve(__dirname, "timelapseArchiveWorker.mjs");
      const worker = new Worker(workerPath, {
        workerData: {
          timelapseDirectory: TIMELAPSE_DIRECTORY,
          archiveDirectory: ARCHIVE_DIRECTORY,
        },
      });

      // Handle messages from the worker
      worker.on("message", (message) => {
        // Remove console.log to avoid interfering with tests
        switch (message.type) {
          case "log":
            // Handle logging messages
            switch (message.level) {
              case "info":
                this.#logger.info(message.message);
                break;
              case "warn":
                this.#logger.warn(message.message);
                break;
              case "error":
                this.#logger.error(message.message);
                break;
              case "debug":
                this.#logger.debug(message.message);
                break;
            }
            break;

          case "progress":
            // Update progress percentage
            this.#archiveProgressPercentage = message.value;
            break;

          case "complete":
            // Worker has completed its task
            this.#isGeneratingTimelapseArchive = false;
            worker.terminate();
            resolve();
            break;
        }
      });

      // Handle worker errors
      worker.on("error", (err) => {
        this.#logger.error(`Worker error in timelapse archive generation: ${err.message}`);
        this.#archiveProgressPercentage = -1;
        this.#isGeneratingTimelapseArchive = false;
        worker.terminate();
        resolve();
      });

      // Handle worker exit
      worker.on("exit", (code) => {
        if (code !== 0) {
          this.#logger.error(`Timelapse archive worker stopped with exit code ${code}`);
          this.#archiveProgressPercentage = -1;
          this.#isGeneratingTimelapseArchive = false;
        }
        resolve();
      });
    });
  }

  public shouldGenerateTimelapseArchive(): boolean {
    // Obviously, only generate timelapse archives if enabled
    if (!this.#enabled) {
      return false;
    }
    const now = new Date();
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();

    // If start and end times are set and valid, run if current time is equal to end time
    if (this.#startTime?.match(/^\d{2}:\d{2}$/) && this.#endTime?.match(/^\d{2}:\d{2}$/)) {
      const [endHours, endMinutes] = this.#endTime.split(":").map(Number);
      if (nowHours === endHours && nowMinutes === endMinutes) {
        return true;
      }
    }
    // If no start or end times, run if current time is midnight (00:00)
    if (this.#startTime === null && this.#endTime === null && nowHours === 0 && nowMinutes === 0) {
      return true;
    }

    return false;
  }

  dispose(): void {
    this.#enabled = false;
    this.stop();
  }
}

export default Timelapse;
