import { IMAGE_DIRECTORY, TIMELAPSE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";
import {
  getDirectorySizeAsync,
  getOldestFilePathAsync,
  getSortedFileAsync,
} from "@sproot/sproot-common/dist/utility/Files";
import fs, { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import winston from "winston";
import Timelapse from "./Timelapse";
import { SDBCameraSettings } from "@sproot/sproot-common/dist/database/SDBCameraSettings";

class ImageCapture {
  #timelapse: Timelapse;
  #logger: winston.Logger;
  #isRunningImageRetention: boolean = false;

  constructor(logger: winston.Logger) {
    this.#timelapse = new Timelapse(async (filename: string, directory: string) => {
      const latestImage = await this.getLatestImageAsync();
      if (latestImage) {
        // Ensure the directory exists
        await fs.promises.mkdir(directory, { recursive: true });
        const outputPath = path.join(directory, filename);
        await fs.promises.writeFile(outputPath, latestImage as unknown as Uint8Array);
      }
    }, logger);
    this.#logger = logger;
  }

  updateTimelapseSettings(settings: SDBCameraSettings): void {
    this.#timelapse.updateSettings(settings);
  }

  async captureImageAsync(fileName: string, url: string, headers: Record<string, string>) {
    let response: Response;
    try {
      response = await fetch(`${url}/capture`, {
        method: "GET",
        headers: headers,
      });
      if (!response?.ok || !response.body) {
        this.#logger.error(
          `Image capture was unsuccessful (status: ${response?.status}).. Filename: ${IMAGE_DIRECTORY}/${fileName}`,
        );
        return;
      }
      // Ensure the directory exists
      await fs.promises.mkdir(IMAGE_DIRECTORY, { recursive: true });

      const outputPath = path.join(IMAGE_DIRECTORY, fileName);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(outputPath));

      this.#logger.info(`Image captured. Filename: ${IMAGE_DIRECTORY}/${fileName}`);
    } catch (e) {
      this.#logger.error(
        `Image capture failed for ${IMAGE_DIRECTORY}/${fileName}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return;
    }
  }

  async getLatestImageAsync(): Promise<Buffer | null> {
    const imagePath = await getSortedFileAsync(
      IMAGE_DIRECTORY,
      (a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime(),
    );
    if (imagePath) {
      return fs.promises.readFile(imagePath);
    }
    return null;
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

  /**
   * Clears all images from the specified directory.
   * @returns true if images were cleared, false if operation was skipped due to ongoing timelapse generation
   */
  async clearAllImagesAsync(directory: string = TIMELAPSE_DIRECTORY): Promise<boolean> {
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

  /**
   * Manages images based on retention settings by removing old images
   * when either space limit or time retention period is exceeded
   */
  async runImageRetentionAsync(
    retentionSize: number = 0,
    retentionDays: number = 0,
    now = new Date(),
    directory = TIMELAPSE_DIRECTORY,
  ): Promise<void> {
    if (this.#isRunningImageRetention || this.#timelapse.isGeneratingTimelapseArchive) {
      return;
    }
    // If directory doesn't exist, nothing to do
    if (!fs.existsSync(directory)) {
      return;
    }

    this.#isRunningImageRetention = true;
    // Get retention settings from current camera settings
    const maxRetentionSizeMB = retentionSize ?? Infinity;
    const retentionPeriodInMS = (retentionDays || 0) * 24 * 60 * 60 * 1000;
    const cutoffTime = now.getTime() - retentionPeriodInMS;
    let directorySizeMB = (await getDirectorySizeAsync(directory)) / (1024 * 1024);

    // Process files until we're within limits
    let oldestFilePath = await getOldestFilePathAsync(directory);

    const ignoreFiles = new Set<string>();
    while (oldestFilePath) {
      // Get stats for the oldest file
      try {
        await fs.promises.access(oldestFilePath, fs.constants.R_OK | fs.constants.W_OK);
      } catch (e) {
        this.#logger.warn(
          `Cannot access file for retention check: ${oldestFilePath}. Skipping. Error: ${e instanceof Error ? e.message : String(e)}`,
        );
        ignoreFiles.add(oldestFilePath);
        oldestFilePath = await getOldestFilePathAsync(directory, ignoreFiles);
        continue;
      }
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
      try {
        await fs.promises.rm(oldestFilePath);
      } catch (e) {
        this.#logger.warn(
          `Cannot delete file for retention check: ${oldestFilePath}. Skipping. Error: ${e instanceof Error ? e.message : String(e)}`,
        );
        ignoreFiles.add(oldestFilePath);
        oldestFilePath = await getOldestFilePathAsync(directory, ignoreFiles);
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

      // Update for next iteration
      oldestFilePath = await getOldestFilePathAsync(directory, ignoreFiles);
    }

    this.#isRunningImageRetention = false;
  }
}

export default ImageCapture;
