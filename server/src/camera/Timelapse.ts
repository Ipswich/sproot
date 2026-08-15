import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { PassThrough, pipeline } from "stream";
import winston from "winston";
import { TIMELAPSE_RESOURCES } from "@sproot/common/utility/Constants";
import { createTimeStampSuffix } from "@sproot/common/utility/Files";
import { SDBCameraSettings } from "@sproot/common/database/SDBCameraSettings";
import { isBetweenTimeStamp } from "@sproot/common/utility/TimeMethods";
import {
  getCameraArchiveDirectory,
  getCameraArchivePath,
  getCameraTimelapseDirectory,
} from "./CameraPaths";

type AddImageToTimelapseFunction = (file: string, directory: string) => Promise<void>;
type EnqueueArchiveGenerationFunction = <T>(task: () => Promise<T>) => Promise<T>;

class Timelapse implements Disposable {
  #cameraId: number;
  #logger: winston.Logger;
  #intervalMinutes: number | null = null;
  #timer: NodeJS.Timeout | null = null;
  #addImageToTimelapseFunction: AddImageToTimelapseFunction;
  #enqueueArchiveGeneration: EnqueueArchiveGenerationFunction;
  #cameraName: string | null = null;
  #enabled: boolean = false;
  #startTime: string | null = null;
  #endTime: string | null = null;
  #isGeneratingTimelapseArchive: boolean = false;
  #archiveProgressPercentage: number = 0;
  #lastArchiveGenerationDuration: number | null = null;
  #archiveImageCount: number = 0;

  constructor(
    cameraIdOrAddImageToTimelapseFunction: number | AddImageToTimelapseFunction,
    addImageToTimelapseFunctionOrLogger:
      | AddImageToTimelapseFunction
      | winston.Logger,
    enqueueArchiveGeneration?: EnqueueArchiveGenerationFunction,
    logger?: winston.Logger,
  ) {
    if (typeof cameraIdOrAddImageToTimelapseFunction === "number") {
      this.#cameraId = cameraIdOrAddImageToTimelapseFunction;
      this.#addImageToTimelapseFunction =
        addImageToTimelapseFunctionOrLogger as AddImageToTimelapseFunction;
      this.#enqueueArchiveGeneration =
        enqueueArchiveGeneration ?? (async (task) => task());
      this.#logger = logger!;
      return;
    }

    this.#cameraId = 1;
    this.#addImageToTimelapseFunction = cameraIdOrAddImageToTimelapseFunction;
    this.#enqueueArchiveGeneration = async (task) => task();
    this.#logger = addImageToTimelapseFunctionOrLogger as winston.Logger;
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

  get timelapseImageCount(): number {
    return this.#archiveImageCount;
  }

  get lastArchiveGenerationDuration(): number | null {
    return this.#lastArchiveGenerationDuration;
  }

  get isGeneratingTimelapseArchive(): boolean {
    return this.#isGeneratingTimelapseArchive;
  }

  get archiveProgress(): number {
    return this.#archiveProgressPercentage;
  }

  async getTimelapseArchiveAsync(): Promise<fs.ReadStream | null> {
    try {
      const archiveFile = getCameraArchivePath(this.#cameraId);
      if (!fs.existsSync(archiveFile)) {
        return null;
      }

      return fs.createReadStream(archiveFile);
    } catch (error) {
      this.#logger.error(
        `Failed to get latest timelapse archive: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async getTimelapseArchiveSizeAsync(): Promise<number | null> {
    try {
      const archiveFile = getCameraArchivePath(this.#cameraId);
      if (!fs.existsSync(archiveFile)) {
        return 0;
      }

      const stats = await fs.promises.stat(archiveFile);
      return stats.size / (1024 * 1024);
    } catch {
      return 0;
    }
  }

  async generateTimelapseArchiveAsync(validateShouldRun: boolean): Promise<void> {
    if (!this.#enabled) {
      this.#lastArchiveGenerationDuration = null;
    }
    if (validateShouldRun && !this.shouldGenerateTimelapseArchive()) {
      return;
    }
    if (this.#isGeneratingTimelapseArchive) {
      return;
    }
    this.#isGeneratingTimelapseArchive = true;

    const startTime = Date.now();
    const profiler = this.#logger.startTimer();
    try {
      const archiveDirectory = getCameraArchiveDirectory(this.#cameraId);
      await fs.promises.mkdir(archiveDirectory, { recursive: true });
      const archiveFile = getCameraArchivePath(this.#cameraId);

      this.#logger.info(`Creating timelapse archive: ${archiveFile}`);
      this.#archiveProgressPercentage = 0;

      const imageData = await this.getTimelapseFileDataAsync();
      this.#archiveImageCount = imageData.length;
      if (imageData.length === 0) {
        this.#logger.info("No timelapse images found to archive");
        return;
      }

      await this.#enqueueArchiveGeneration(() => this.createArchiveAsync(imageData, archiveFile));
      this.#logger.info(`Successfully created timelapse archive with ${imageData.length} images`);
    } catch (error) {
      this.#logger.error(
        `Failed to create timelapse archive: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.#archiveProgressPercentage = -1;
    } finally {
      this.#lastArchiveGenerationDuration = (Date.now() - startTime) / 1000;
      setTimeout(() => {
        profiler.done({
          message: `Timelapse archive process completed`,
          level: "debug",
        });
        this.#isGeneratingTimelapseArchive = false;
      }, 0);
    }
  }

  shouldGenerateTimelapseArchive(): boolean {
    if (!this.#enabled) {
      return false;
    }

    const now = new Date();
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();

    if (this.#startTime?.match(/^\d{2}:\d{2}$/) && this.#endTime?.match(/^\d{2}:\d{2}$/)) {
      const [endHours, endMinutes] = this.#endTime.split(":").map(Number);
      if (nowHours === endHours && nowMinutes === endMinutes) {
        return true;
      }
    }

    if (this.#startTime === null && this.#endTime === null && nowHours === 0 && nowMinutes === 0) {
      return true;
    }

    return false;
  }

  private async createArchiveAsync(
    imageData: { name: string; size: number }[],
    archiveFile: string,
  ): Promise<void> {
    const unarchivedBytes = imageData.reduce((total, file) => total + file.size, 0);

    return new Promise((resolve, reject) => {
      let archivedBytes = 0;
      const output = fs.createWriteStream(archiveFile);

      const tarProcess = spawn("nice", [
        "-n",
        "19",
        "ionice",
        "-c",
        "3",
        "tar",
        "-c",
        "-f",
        "-",
        "-C",
        path.resolve(TIMELAPSE_RESOURCES),
        ".",
        "-C",
        path.resolve(getCameraTimelapseDirectory(this.#cameraId)),
        ".",
      ]);
      const passThrough = new PassThrough();

      passThrough.on("data", (chunk: Buffer) => {
        archivedBytes += chunk.byteLength;
        this.#archiveProgressPercentage = Math.min(
          Math.round((archivedBytes / unarchivedBytes) * 100),
          100,
        );
      });

      pipeline(tarProcess.stdout, passThrough, output, (err) => {
        if (err) {
          this.#logger.error(`Pipeline error: ${err.message}`);
          reject(err);
        } else {
          this.#logger.info("Timelapse archive created successfully");
          resolve();
        }
      });
    });
  }

  private async getTimelapseFileDataAsync(): Promise<{ name: string; size: number }[]> {
    const timelapseDirectory = getCameraTimelapseDirectory(this.#cameraId);
    if (!fs.existsSync(timelapseDirectory)) {
      return [];
    }

    const files = await fs.promises.readdir(timelapseDirectory);
    const fileStatsPromises = files
      .filter((file) => file.endsWith(".jpg"))
      .map(async (file) => {
        const filePath = path.join(timelapseDirectory, file);
        try {
          const stats = await fs.promises.stat(filePath);
          return { file, size: stats.size, isFile: stats.isFile() };
        } catch {
          return { file, isFile: false };
        }
      });

    const fileStats = await Promise.all(fileStatsPromises);
    return fileStats
      .filter((item) => item.isFile)
      .map((item) => {
        return { name: item.file, size: item.size! };
      });
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
        isBetweenTimeStamp(this.#startTime, this.#endTime)
      ) {
        await this.addImage();
      }

      this.scheduleNextExecution();
    }, intervalMs);
  }

  private async addImage(): Promise<void> {
    try {
      const now = new Date();
      const cameraName = (this.#cameraName ?? `camera-${this.#cameraId}`).replace(/\s+/g, "-");
      const fileName = `${cameraName}_${createTimeStampSuffix(now)}.jpg`;
      const timelapseDirectory = getCameraTimelapseDirectory(this.#cameraId);

      await fs.promises.mkdir(timelapseDirectory, { recursive: true });
      await this.#addImageToTimelapseFunction(fileName, timelapseDirectory);
      this.#logger.info(`Added timelapse image ${fileName} to ${timelapseDirectory}`);
    } catch (error) {
      this.#logger.error(
        `Failed to add timelapse image: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  [Symbol.dispose](): void {
    this.#enabled = false;
    this.stop();
  }
}

export default Timelapse;
