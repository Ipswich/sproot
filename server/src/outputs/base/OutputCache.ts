import type { IOutputsRepository } from "../../database/repositories/outputs/IOutputsRepository";
import { SDBOutputState } from "@sproot/common/database/SDBOutputState";
import { QueueCache } from "@sproot/common/utility/QueueCache";
import winston from "winston";

export class OutputCache {
  queueCache: QueueCache<SDBOutputState>;
  #outputsRepository: IOutputsRepository;
  logger: winston.Logger;
  constructor(maxSize: number, outputsRepository: IOutputsRepository, logger: winston.Logger) {
    this.queueCache = new QueueCache(maxSize);
    this.#outputsRepository = outputsRepository;
    this.logger = logger;
  }

  get(offset?: number, limit?: number): SDBOutputState[] {
    return this.queueCache.get(offset, limit);
  }

  async loadFromDatabaseAsync(
    outputId: number,
    minutes: number,
    bucketMinutes: number = 5,
  ): Promise<void> {
    this.queueCache.clear();
    const states = await this.#outputsRepository.getBucketedOutputStatesAsync(
      { id: outputId },
      new Date(),
      minutes,
      bucketMinutes,
      true,
    );
    const sdbStates =
      states ??
      (await this.#outputsRepository.getOutputStatesAsync(
        { id: outputId },
        new Date(),
        minutes,
        true,
      ));
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
