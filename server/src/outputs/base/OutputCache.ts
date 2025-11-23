import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB.js";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState.js";
import { QueueCache } from "@sproot/sproot-common/dist/utility/QueueCache.js";
import winston from "winston";

export class OutputCache {
  queueCache: QueueCache<SDBOutputState>;
  sprootDB: ISprootDB;
  logger: winston.Logger;
  constructor(maxSize: number, sprootDB: ISprootDB, logger: winston.Logger) {
    this.queueCache = new QueueCache(maxSize);
    this.sprootDB = sprootDB;
    this.logger = logger;
  }

  get(offset?: number, limit?: number): SDBOutputState[] {
    return this.queueCache.get(offset, limit);
  }

  async loadFromDatabaseAsync(outputId: number, minutes: number): Promise<void> {
    this.queueCache.clear();
    const sdbStates = await this.sprootDB.getOutputStatesAsync(
      { id: outputId },
      new Date(),
      minutes,
      true,
    );
    for (const sdbState of sdbStates) {
      const newState = {
        controlMode: sdbState.controlMode,
        value: sdbState.value,
        logTime: sdbState.logTime,
      } as SDBOutputState;
      this.queueCache.addData(newState);
    }
  }

  addData(state: SDBOutputState, now = new Date()): void {
    if (state.value == undefined) {
      return;
    }

    this.queueCache.addData({
      controlMode: state.controlMode,
      value: state.value,
      logTime: now.toISOString(),
    } as SDBOutputState);
  }

  clear(): void {
    this.queueCache.clear();
  }
}
