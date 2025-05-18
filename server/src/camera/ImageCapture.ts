import { IMAGE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";
import fs, { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import winston from "winston";

class ImageCapture {
  #logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.#logger = logger;
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
    const imagePath = await this.getSortedImageAsync(
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
    retentionSize: number = Infinity,
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
    let directorySizeMB = (await this.getDirectorySizeAsync(directory)) / (1024 * 1024);

    // Process files until we're within limits
    let oldestFilePath = await this.getOldestImagePathAsync();

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
      oldestFilePath = await this.getOldestImagePathAsync();
    }
  }

  /**
   * Gets the total size of a directory's contents in bytes
   */
  private async getDirectorySizeAsync(directoryPath: string): Promise<number> {
    // Ensure the directory exists
    if (!fs.existsSync(directoryPath)) {
      return 0;
    }

    let totalSize = 0;
    const items = await fs.promises.readdir(directoryPath);

    // Process each item (file or subdirectory)
    for (const item of items) {
      const itemPath = path.join(directoryPath, item);
      const stats = await fs.promises.stat(itemPath);

      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        totalSize += await this.getDirectorySizeAsync(itemPath);
      }
    }

    return totalSize;
  }

  private async getSortedImageAsync(
    sort: (
      a: {
        file: string;
        stats: fs.Stats;
      },
      b: {
        file: string;
        stats: fs.Stats;
      },
    ) => number,
  ) {
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

      // Sort files
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(IMAGE_DIRECTORY, file);
          const stats = await fs.promises.stat(filePath);
          return { file, stats };
        }),
      );
      fileStats.sort(sort);

      // Load image
      const imagePath = path.join(IMAGE_DIRECTORY, fileStats[0]!.file);

      return imagePath;
    } catch (error) {
      this.#logger.error(`Error retrieving image: ${error}`);
      return null;
    }
  }

  private async getOldestImagePathAsync(): Promise<string | null> {
    return await this.getSortedImageAsync(
      (a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime(),
    );
  }
}

export default ImageCapture;
