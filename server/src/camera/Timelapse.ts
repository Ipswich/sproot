import fs from "fs";
import winston from "winston";
import { TIMELAPSE_DIRECTORY } from "@sproot/sproot-common/dist/utility/Constants";

type AddImageToTimelapseFunction = (file: string, directory: string) => Promise<void>;

class Timelapse {
  #logger: winston.Logger;
  #intervalMinutes: number | null = null;
  #timer: NodeJS.Timeout | null = null;
  addImageToTimelapseFunction: AddImageToTimelapseFunction;
  #cameraName: string | null = null;
  #enabled: boolean = false;

  constructor(addImageToTimelapseFunction: AddImageToTimelapseFunction, logger: winston.Logger) {
    this.addImageToTimelapseFunction = addImageToTimelapseFunction;
    this.#logger = logger;
  }

  updateSettings(cameraName: string, enabled: boolean, intervalMinutes: number | null): void {
    this.#cameraName = cameraName;

    if (this.#intervalMinutes !== intervalMinutes) {
      this.#intervalMinutes = intervalMinutes;
      if (this.#timer) {
        clearTimeout(this.#timer);
        this.#timer = null;
      }
      this.scheduleNextExecution();
    }

    if (this.#enabled && !enabled) {
      this.#enabled = false;
      this.stop();
    } else if (!this.#enabled && enabled) {
      this.#enabled = true;
      this.start();
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
      await this.addImage();

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
