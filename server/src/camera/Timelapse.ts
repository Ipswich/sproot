import fs from "fs";
import winston from "winston";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { TIMELAPSE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";
import { SDBCameraSettings } from "@sproot/sproot-common/dist/database/SDBCameraSettings";
import { isBetweenTimeStamp } from "@sproot/sproot-common/dist/utility/TimeMethods";

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

  /**
   * Creates and returns a gzipped archive of timelapse images between two dates
   * @param startDate The start date to filter images
   * @param endDate The end date to filter images
   * @returns Buffer containing the gzipped archive
   */
  async getTimelapseArchive(startDate: Date, endDate: Date): Promise<Buffer> {
  try {
    const tempDir = path.join(os.tmpdir(), `timelapse-${Date.now()}`);
    const archivePath = path.join(tempDir, 'timelapse.tar'); 
    await fs.promises.mkdir(tempDir, { recursive: true });
    const files = await fs.promises.readdir(TIMELAPSE_DIRECTORY);
    
    const matchingFiles = files.filter(file => {
      const match = file.match(/_(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.jpg$/);
      if (!match) return false;
      
      const [_, year, month, day, hours, minutes] = match;
      
      const fileDate = new Date(
        parseInt(year!),
        parseInt(month!) - 1, // JS months are 0-indexed
        parseInt(day!),
        parseInt(hours!),
        parseInt(minutes!)
      );
      
      return fileDate >= startDate && fileDate <= endDate;
    });
    
    if (matchingFiles.length === 0) {
      throw new Error('No timelapse images found in the specified date range');
    }

    // Create a file list for tar to use
    const fileListPath = path.join(tempDir, 'filelist.txt');
    const filePaths = matchingFiles.map(file => path.join(TIMELAPSE_DIRECTORY, file));
    await fs.promises.writeFile(fileListPath, filePaths.join('\n'));
    
    // Create tar archive directly from source files using -T option
    const execAsync = promisify(exec);
    await execAsync(`tar -cf "${archivePath}" --transform='s|.*/||' -T "${fileListPath}"`);
    
    // Read the resulting archive
    const archiveBuffer = await fs.promises.readFile(archivePath);
    
    // Clean up
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    
    this.#logger.info(`Created timelapse archive with ${matchingFiles.length} images`);
    
    return archiveBuffer;
  } catch (error) {
    this.#logger.error(
      `Failed to create timelapse archive: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
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

  dispose(): void {
    this.#enabled = false;
    this.stop();
  }
}

export default Timelapse;
