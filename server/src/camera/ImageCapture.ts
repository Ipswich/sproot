import { TIMELAPSE_DIRECTORY } from "@sproot/common/utility/Constants";
import { getDirectorySizeAsync, getOldestFilePathAsync } from "@sproot/common/utility/Files";
import fs, { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import winston from "winston";
import Timelapse from "./Timelapse";
import { SDBCameraSettings } from "@sproot/common/database/SDBCameraSettings";
import {
  getCameraImageDirectory,
  getCameraLatestImagePath,
  getCameraTimelapseDirectory,
} from "./CameraPaths";

type AddImageToTimelapseFunction = (filename: string, directory: string) => Promise<void>;
type EnqueueArchiveGenerationFunction = <T>(task: () => Promise<T>) => Promise<T>;

class ImageCapture {
  #cameraId: number;
  #timelapse: Timelapse;
  #logger: winston.Logger;
  #isRunningImageRetention: boolean = false;

  constructor(
    cameraIdOrLogger: number | winston.Logger,
    addImageToTimelapseFunction?: AddImageToTimelapseFunction,
    enqueueArchiveGeneration?: EnqueueArchiveGenerationFunction,
    logger?: winston.Logger,
  ) {
    if (typeof cameraIdOrLogger === "number") {
      this.#cameraId = cameraIdOrLogger;
      this.#logger = logger!;
      this.#timelapse = new Timelapse(
        cameraIdOrLogger,
        addImageToTimelapseFunction!,
        enqueueArchiveGeneration!,
        this.#logger,
      );
      return;
    }

    this.#cameraId = 1;
    this.#logger = cameraIdOrLogger;
    this.#timelapse = new Timelapse(async (filename: string, directory: string) => {
      const latestImage = await this.getLatestImageAsync();
      if (!latestImage) {
        return;
      }

      await fs.promises.mkdir(directory, { recursive: true });
      const outputPath = path.join(directory, filename);
      await fs.promises.writeFile(outputPath, latestImage as unknown as Uint8Array);
    }, this.#logger);
  }

  updateTimelapseSettings(settings: SDBCameraSettings): void {
    this.#timelapse.updateSettings(settings);
  }

  async captureImageAsync(
    fileName: string,
    url: string,
    headers: Record<string, string>,
    directory = getCameraImageDirectory(this.#cameraId),
  ) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers,
      });
      if (!response.ok || !response.body) {
        this.#logger.error(
          `Image capture was unsuccessful (status: ${response.status}). Filename: ${directory}/${fileName}`,
        );
        return;
      }

      await fs.promises.mkdir(directory, { recursive: true });
      const outputPath = path.join(directory, fileName);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(outputPath));

      this.#logger.info(`Image captured. Filename: ${outputPath}`);
    } catch (e) {
      this.#logger.error(
        `Image capture failed for ${directory}/${fileName}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async captureLatestImageAsync(url: string, headers: Record<string, string>) {
    return this.captureImageAsync(
      "latest.jpg",
      url,
      headers,
      getCameraImageDirectory(this.#cameraId),
    );
  }

  async getLatestImageAsync(): Promise<Buffer | null> {
    const imagePath = getCameraLatestImagePath(this.#cameraId);
    if (!fs.existsSync(imagePath)) {
      return null;
    }

    return fs.promises.readFile(imagePath);
  }

  getLastTimelapseGenerationDuration(): number | null {
    return this.#timelapse.lastArchiveGenerationDuration;
  }

  getTimelapseImageCount(): number {
    return this.#timelapse.timelapseImageCount;
  }

  async getTimelapseArchiveAsync(): Promise<fs.ReadStream | null> {
    return this.#timelapse.getTimelapseArchiveAsync();
  }

  async getTimelapseArchiveSizeAsync(): Promise<number | null> {
    return this.#timelapse.getTimelapseArchiveSizeAsync();
  }

  async regenerateTimelapseArchiveAsync(validateShouldRun: boolean = true): Promise<void> {
    return this.#timelapse.generateTimelapseArchiveAsync(validateShouldRun);
  }

  getTimelapseGenerationStatus(): {
    isGenerating: boolean;
    archiveProgress: number;
  } {
    return {
      isGenerating: this.#timelapse.isGeneratingTimelapseArchive,
      archiveProgress: this.#timelapse.archiveProgress,
    };
  }

  async clearAllImagesAsync(
    directory = getCameraTimelapseDirectory(this.#cameraId),
  ): Promise<boolean> {
    if (this.#timelapse.isGeneratingTimelapseArchive) {
      return false;
    }
    if (!fs.existsSync(directory)) {
      this.#logger.info(`Directory does not exist, nothing to clear: ${directory}`);
      return true;
    }

    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    for (const dirent of entries) {
      const targetPath = path.join(directory, dirent.name);
      try {
        if (!dirent.isDirectory()) {
          await fs.promises.unlink(targetPath);
        }
      } catch (e) {
        this.#logger.warn(
          `Failed to remove ${targetPath}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    this.#logger.info(`All files cleared from ${directory}`);
    return true;
  }

  async runImageRetentionAsync(
    retentionSize: number = 0,
    retentionDays: number = 0,
    now = new Date(),
    directory = TIMELAPSE_DIRECTORY,
  ): Promise<void> {
    const timelapseDirectory =
      directory === TIMELAPSE_DIRECTORY ? getCameraTimelapseDirectory(this.#cameraId) : directory;

    if (this.#isRunningImageRetention || this.#timelapse.isGeneratingTimelapseArchive) {
      return;
    }
    if (!fs.existsSync(timelapseDirectory)) {
      return;
    }

    this.#isRunningImageRetention = true;
    const maxRetentionSizeMB = retentionSize ?? Infinity;
    const retentionPeriodInMS = (retentionDays || 0) * 24 * 60 * 60 * 1000;
    const cutoffTime = now.getTime() - retentionPeriodInMS;
    let directorySizeMB = (await getDirectorySizeAsync(timelapseDirectory)) / (1024 * 1024);
    let oldestFilePath = await getOldestFilePathAsync(timelapseDirectory);

    const ignoreFiles = new Set<string>();
    while (oldestFilePath) {
      try {
        await fs.promises.access(oldestFilePath, fs.constants.R_OK | fs.constants.W_OK);
      } catch (e) {
        this.#logger.warn(
          `Cannot access file for retention check: ${oldestFilePath}. Skipping. Error: ${e instanceof Error ? e.message : String(e)}`,
        );
        ignoreFiles.add(oldestFilePath);
        oldestFilePath = await getOldestFilePathAsync(timelapseDirectory, ignoreFiles);
        continue;
      }
      let fileSizeMB: number;
      let oldestFileTime: number;
      let oversizedStorage: boolean;
      let exceededRetentionPeriod: boolean;
      try {
        const stats = await fs.promises.stat(oldestFilePath);
        oldestFileTime = stats.mtime.getTime();
        fileSizeMB = stats.size / (1024 * 1024);
        oversizedStorage = directorySizeMB > maxRetentionSizeMB;
        exceededRetentionPeriod = retentionPeriodInMS > 0 && oldestFileTime < cutoffTime;

        if (!oversizedStorage && !exceededRetentionPeriod) {
          break;
        }

        await fs.promises.rm(oldestFilePath);
      } catch (e) {
        this.#logger.warn(
          `Cannot delete file for retention check: ${oldestFilePath}. Skipping. Error: ${e instanceof Error ? e.message : String(e)}`,
        );
        ignoreFiles.add(oldestFilePath);
        oldestFilePath = await getOldestFilePathAsync(timelapseDirectory, ignoreFiles);
        continue;
      }
      const reasons = [];
      if (oversizedStorage) {
        reasons.push(
          `Size limit exceeded (${directorySizeMB.toFixed(2)} MB > ${maxRetentionSizeMB} MB)`,
        );
      }
      if (exceededRetentionPeriod) {
        reasons.push(
          `Retention period exceeded (${new Date(oldestFileTime).toISOString()} < ${new Date(cutoffTime).toISOString()})`,
        );
      }
      this.#logger.debug(`Removed old image: ${oldestFilePath}, ${reasons.join(", ")}`);

      directorySizeMB -= fileSizeMB;
      oldestFilePath = await getOldestFilePathAsync(timelapseDirectory, ignoreFiles);
    }

    this.#isRunningImageRetention = false;
  }

  [Symbol.dispose](): void {
    this.#timelapse[Symbol.dispose]();
  }
}

export default ImageCapture;
