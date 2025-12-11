import fs from "fs";
import winston from "winston";
import {
  ARCHIVE_DIRECTORY,
  TIMELAPSE_DIRECTORY,
  TIMELAPSE_RESOURCES,
} from "@sproot/sproot-common/dist/utility/Constants";
import { SDBCameraSettings } from "@sproot/sproot-common/dist/database/SDBCameraSettings";
import { isBetweenTimeStamp } from "@sproot/sproot-common/dist/utility/TimeMethods";
import path from "path";
import { PassThrough, pipeline } from "stream";
import { spawn } from "child_process";

type AddImageToTimelapseFunction = (file: string, directory: string) => Promise<void>;

class Timelapse implements Disposable {
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
  #lastArchiveGenerationDuration: number | null = null;
  #archiveImageCount: number = 0;

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
      if (!fs.existsSync(ARCHIVE_DIRECTORY)) {
        return null;
      }

      const files = await fs.promises.readdir(ARCHIVE_DIRECTORY);
      if (!files.length) return null;

      const matchingFiles = files.filter((file) => file.match(/^timelapse\.tar$/));

      if (!matchingFiles.length) {
        return null;
      }

      const latestFile = path.join(ARCHIVE_DIRECTORY, matchingFiles[0]!);

      return fs.createReadStream(latestFile);
    } catch (error) {
      this.#logger.error(
        `Failed to get latest timelapse archive: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * @returns The size of the timelapse archive in MB, or null if timelapse is disabled.
   */
  async getTimelapseArchiveSizeAsync(): Promise<number | null> {
    if (!this.#enabled) {
      return null;
    }
    try {
      await fs.promises.mkdir(ARCHIVE_DIRECTORY, { recursive: true });
      const files = await fs.promises.readdir(ARCHIVE_DIRECTORY);
      const archiveFile = files.filter((file) => file.match("timelapse.tar"))[0];
      if (archiveFile === undefined) {
        return 0;
      }
      const timelapseFile = path.join(ARCHIVE_DIRECTORY, archiveFile);
      const stats = await fs.promises.stat(timelapseFile);
      return stats.size / (1024 * 1024);
    } catch (error) {
      return 0;
    }
  }

  async generateTimelapseArchiveAsync(validateShouldRun: boolean): Promise<void> {
    // Reset duration if timelapses are disabled
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
      await fs.promises.mkdir(ARCHIVE_DIRECTORY, { recursive: true });
      const archiveFile = path.join(ARCHIVE_DIRECTORY, "timelapse.tar");

      this.#logger.info(`Creating timelapse archive: ${archiveFile}`);
      this.#archiveProgressPercentage = 0;

      const imageData = await this.getTimelapseFileDataAsync();
      this.#archiveImageCount = imageData.length;
      if (imageData.length === 0) {
        this.#logger.info("No timelapse images found to archive");
        return;
      }

      await this.createArchiveAsync(imageData, archiveFile);
      this.#logger.info(`Successfully created timelapse archive with ${imageData.length} images`);
    } catch (error) {
      this.#logger.error(
        `Failed to create timelapse archive: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.#archiveProgressPercentage = -1;
    } finally {
      this.#lastArchiveGenerationDuration = (Date.now() - startTime) / 1000; // seconds
      // The setTimeout should force cleanup of resources before actually calling things "done."
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

  private async createArchiveAsync(
    imageData: { name: string; size: number }[],
    archiveFile: string,
  ): Promise<void> {
    const unarchivedBytes = imageData.reduce((total, file) => total + file.size, 0);

    return new Promise((resolve, reject) => {
      let archivedBytes = 0;
      const output = fs.createWriteStream(archiveFile);

      const niceArgs = ["-n", "19"];
      const ioniceArgs = ["-c", "3"];
      const tarArgs = [
        "-c", // create
        "-f",
        "-", // output to stdout
        "-C",
        TIMELAPSE_RESOURCES, // change to resources directory
        ".",
        "-C",
        "../../", // Return to the root directory
        "-C",
        TIMELAPSE_DIRECTORY, // set directory
        ".",
      ];

      // Use nice and ionice to give the tar process lower priority - fast causes problems for low end devices
      const tarProcess = spawn("nice", [...niceArgs, "ionice", ...ioniceArgs, "tar", ...tarArgs]);
      const passThrough = new PassThrough();

      passThrough.on("data", (_chunk: Buffer) => {
        const chunkSize = _chunk.byteLength;
        archivedBytes += chunkSize;
        this.#archiveProgressPercentage = Math.min(
          Math.round((archivedBytes / unarchivedBytes) * 100),
          100,
        );

        const MB = 1024 * 1024;
        const logInterval = 100 * MB;
        const lastLoggedMB = Math.floor(archivedBytes / logInterval);
        const currentMB = Math.floor((archivedBytes + chunkSize) / logInterval);
        if (currentMB > lastLoggedMB || unarchivedBytes <= archivedBytes) {
          this.#logger.info(
            `Processed ${archivedBytes} of ${unarchivedBytes} bytes (${this.#archiveProgressPercentage}%)`,
          );
        }
      });

      // Pipe tar to pass through for logging, and then ultimately to the output stream
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
    const files = await fs.promises.readdir(TIMELAPSE_DIRECTORY);
    const fileStatsPromises = files
      .filter((file) => file.endsWith(".jpg"))
      .map(async (file) => {
        const filePath = path.join(TIMELAPSE_DIRECTORY, file);
        try {
          const stats = await fs.promises.stat(filePath);
          return { file, size: stats.size, isFile: stats.isFile() };
        } catch (err) {
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

  [Symbol.dispose](): void {
    this.#enabled = false;
    this.stop();
  }
}

export default Timelapse;
