import { IMAGE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";
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

class ImageCapture {
  #timelapse: Timelapse;
  #logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.#timelapse = new Timelapse(async (filename: string, directory: string) => {
      const latestImage = await this.getLatestImageAsync();
      if (latestImage) {
        await fs.promises.writeFile(path.join(directory, filename), latestImage);
      }
    }, logger);
    this.#logger = logger;
  }

  updateTimelapseSettings(
    cameraName: string,
    enabled: boolean,
    intervalMinutes: number | null,
  ): void {
    this.#timelapse.updateSettings(cameraName, enabled, intervalMinutes);
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
          `Image capture was unsuccessful(status: ${response?.status}).. Filename: ${IMAGE_DIRECTORY}/${fileName}`,
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

  /**
   * Manages images based on retention settings by removing old images
   * when either space limit or time retention period is exceeded
   */
  async runImageRetentionAsync(
    retentionSize: number = 0,
    retentionDays: number = 0,
    now = new Date(),
    directory = IMAGE_DIRECTORY,
  ): Promise<void> {
    // Ensure the directory exists
    if (!fs.existsSync(directory)) {
      this.#logger.warn(`Image directory ${directory} does not exist`);
      return;
    }

    // Get retention settings from current camera settings
    const maxRetentionSizeMB = retentionSize ?? Infinity;
    const retentionPeriodInMS = (retentionDays || 0) * 24 * 60 * 60 * 1000;
    const cutoffTime = now.getTime() - retentionPeriodInMS;
    let directorySizeMB = (await getDirectorySizeAsync(directory)) / (1024 * 1024);

    // Process files until we're within limits
    let oldestFilePath = await getOldestFilePathAsync(IMAGE_DIRECTORY);

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
      oldestFilePath = await getOldestFilePathAsync(IMAGE_DIRECTORY);
    }
  }
}

export default ImageCapture;
