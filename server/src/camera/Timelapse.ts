import fs from "fs";
import winston from "winston";
import { TIMELAPSE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";

type ImageCaptureFunction = (file: string, directory: string) => Promise<void>;

class Timelapse {
  #logger: winston.Logger;
  #intervalMinutes: number | null = null;
  #timer: NodeJS.Timeout | null = null;
  #captureFunction: ImageCaptureFunction;
  #cameraName: string | null = null;
  #enabled: boolean = false;

  constructor(captureFunction: ImageCaptureFunction, logger: winston.Logger) {
    this.#captureFunction = captureFunction;
    this.#logger = logger;
  }

  /**
   * Starts the timelapse capture process. Does nothing if already started.
   */
  private start(): void {
    if (this.#enabled || this.#intervalMinutes == null) {
      return;
    }
    this.#enabled = true;
    this.scheduleNextExecution();

    this.#logger.info(
      `Timelapse started, capturing every ${this.#intervalMinutes} ${this.#intervalMinutes > 1 ? "minutes" : "minute"}`,
    );
  }

  private stop(): void {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#logger.info("Timelapse stopped");
  }

  updateSettings(cameraName: string, enabled: boolean, intervalMinutes: number): void {
    if (this.#enabled && !enabled) {
      this.stop();
    } else if (!this.#enabled && enabled) {
      this.start();
    }
    this.#intervalMinutes = intervalMinutes;
    this.#cameraName = cameraName;
    this.#enabled = enabled;
  }

  private scheduleNextExecution(): void {
    if (!this.#enabled || this.#intervalMinutes === null) {
      return;
    }
    const intervalMs = this.#intervalMinutes * 60 * 1000;

    // Schedule the next capture
    this.#timer = setTimeout(async () => {
      await this.captureTimelapseImage();

      this.scheduleNextExecution();
    }, intervalMs);
  }

  private async captureTimelapseImage(): Promise<void> {
    try {
      // Create timestamp for unique filenames
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");

      // Create filename with timestamp
      const fileName = `${this.#cameraName}_${year}_${month}_${day}_${hours}_${minutes}.jpg`;

      // Ensure directory exists
      await fs.promises.mkdir(TIMELAPSE_DIRECTORY, { recursive: true });

      // Use the capture function to save the image
      await this.#captureFunction(fileName, TIMELAPSE_DIRECTORY);
    } catch (error) {
      this.#logger.error(
        `Failed to add timelapse image: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  dispose(): void {
    this.#enabled = false;
    this.stop();
  }
}

export { Timelapse };
