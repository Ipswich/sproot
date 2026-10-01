import type { IOutputsRepository } from "../database/repositories/outputs/IOutputsRepository";
import type { ISensorsRepository } from "../database/repositories/sensors/ISensorsRepository";
import type { ISubcontrollersRepository } from "../database/repositories/subcontrollers/ISubcontrollersRepository";
import type {
  DeletionQueueJob,
  DeletionRequestResult,
  IDeletionQueueRepository,
} from "../database/repositories/deletion-queue/IDeletionQueueRepository";
import type { IEventBus } from "../eventbus/IEventBus";
import { OutputModifiedEvent } from "../eventbus/events/outputs/OutputModifiedEvent";
import { SensorModifiedEvent } from "../eventbus/events/sensors/SensorModifiedEvent";
import winston from "winston";

const DELETE_BATCH_SIZE = 5000;
const POLL_INTERVAL_MS = 1000;
const LEASE_MS = 15000;
const RETRY_DELAY_MS = 5000;
const SUBCONTROLLER_RETRY_DELAY_MS = 1000;

export type DeferredOutputsRepository = IOutputsRepository & {
  requestDeletionAsync(
    id: number,
    deletionQueueRepository: IDeletionQueueRepository,
  ): Promise<DeletionRequestResult>;
  cleanupPendingDeletionDependenciesAsync(id: number): Promise<void>;
  deletePendingDeletionDataBatchAsync(id: number, batchSize: number): Promise<number>;
  finalizePendingDeletionAsync(id: number): Promise<void>;
};

export type DeferredSensorsRepository = ISensorsRepository & {
  requestDeletionAsync(
    id: number,
    deletionQueueRepository: IDeletionQueueRepository,
  ): Promise<DeletionRequestResult>;
  cleanupPendingDeletionDependenciesAsync(id: number): Promise<void>;
  deletePendingDeletionDataBatchAsync(id: number, batchSize: number): Promise<number>;
  finalizePendingDeletionAsync(id: number): Promise<void>;
};

export type DeferredSubcontrollersRepository = ISubcontrollersRepository & {
  requestDeletionAsync(
    id: number,
    deletionQueueRepository: IDeletionQueueRepository,
  ): Promise<DeletionRequestResult>;
  requestChildDeletionsAsync(
    id: number,
    deletionQueueRepository: IDeletionQueueRepository,
  ): Promise<{
    outputIds: number[];
    sensorIds: number[];
    remainingOutputCount: number;
    remainingSensorCount: number;
  }>;
  finalizePendingDeletionAsync(id: number): Promise<number>;
};

export class DeferredDeletionService implements Disposable {
  readonly #outputsRepository: DeferredOutputsRepository;
  readonly #sensorsRepository: DeferredSensorsRepository;
  readonly #subcontrollersRepository: DeferredSubcontrollersRepository;
  readonly #deletionQueueRepository: IDeletionQueueRepository;
  readonly #eventBus: IEventBus;
  readonly #logger: winston.Logger;
  readonly #workerId = `deletion-worker:${crypto.randomUUID()}`;
  readonly #timer: ReturnType<typeof setInterval>;
  #isProcessing = false;

  static async createInstanceAsync(
    outputsRepository: DeferredOutputsRepository,
    sensorsRepository: DeferredSensorsRepository,
    subcontrollersRepository: DeferredSubcontrollersRepository,
    deletionQueueRepository: IDeletionQueueRepository,
    eventBus: IEventBus,
    logger: winston.Logger,
  ): Promise<DeferredDeletionService> {
    const service = new DeferredDeletionService(
      outputsRepository,
      sensorsRepository,
      subcontrollersRepository,
      deletionQueueRepository,
      eventBus,
      logger,
    );
    void service.processQueueAsync();
    return service;
  }

  private constructor(
    outputsRepository: DeferredOutputsRepository,
    sensorsRepository: DeferredSensorsRepository,
    subcontrollersRepository: DeferredSubcontrollersRepository,
    deletionQueueRepository: IDeletionQueueRepository,
    eventBus: IEventBus,
    logger: winston.Logger,
  ) {
    this.#outputsRepository = outputsRepository;
    this.#sensorsRepository = sensorsRepository;
    this.#subcontrollersRepository = subcontrollersRepository;
    this.#deletionQueueRepository = deletionQueueRepository;
    this.#eventBus = eventBus;
    this.#logger = logger;
    this.#timer = setInterval(() => {
      void this.processQueueAsync();
    }, POLL_INTERVAL_MS);
  }

  [Symbol.dispose](): void {
    clearInterval(this.#timer);
  }

  async deleteOutputAsync(outputId: number): Promise<DeletionRequestResult> {
    const result = await this.#outputsRepository.requestDeletionAsync(
      outputId,
      this.#deletionQueueRepository,
    );
    if (result === "queued") {
      void this.#eventBus.publishAsync(new OutputModifiedEvent({}));
      void this.processQueueAsync();
    }
    return result;
  }

  async deleteSensorAsync(sensorId: number): Promise<DeletionRequestResult> {
    const result = await this.#sensorsRepository.requestDeletionAsync(
      sensorId,
      this.#deletionQueueRepository,
    );
    if (result === "queued") {
      void this.#eventBus.publishAsync(new SensorModifiedEvent({}));
      void this.processQueueAsync();
    }
    return result;
  }

  async deleteSubcontrollerAsync(subcontrollerId: number): Promise<DeletionRequestResult> {
    const result = await this.#subcontrollersRepository.requestDeletionAsync(
      subcontrollerId,
      this.#deletionQueueRepository,
    );
    if (result === "queued") {
      void this.processQueueAsync();
    }
    return result;
  }

  async processQueueAsync(): Promise<void> {
    if (this.#isProcessing) {
      return;
    }

    this.#isProcessing = true;
    try {
      while (true) {
        const job = await this.#deletionQueueRepository.claimNextAsync(this.#workerId, LEASE_MS);
        if (!job) {
          return;
        }

        try {
          const completed = await this.#processClaimedJobAsync(job);
          if (completed) {
            await this.#deletionQueueRepository.completeAsync(job.id, this.#workerId);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.#logger.error(
            `Deferred deletion failed for ${job.entityType}:${job.entityId} - ${errorMessage}`,
          );
          await this.#deletionQueueRepository.requeueAsync(
            job.id,
            this.#workerId,
            this.#getRetryDelayMs(job.attemptCount),
            errorMessage,
          );
        }
      }
    } finally {
      this.#isProcessing = false;
    }
  }

  async #processClaimedJobAsync(job: DeletionQueueJob): Promise<boolean> {
    switch (job.entityType) {
      case "output":
        await this.#processOutputJobAsync(job);
        return true;
      case "sensor":
        await this.#processSensorJobAsync(job);
        return true;
      case "subcontroller":
        return this.#processSubcontrollerJobAsync(job);
      default:
        throw new Error(`Unsupported deletion job type: ${String(job.entityType)}`);
    }
  }

  async #processOutputJobAsync(job: DeletionQueueJob): Promise<void> {
    await this.#outputsRepository.cleanupPendingDeletionDependenciesAsync(job.entityId);
    await this.#deletionQueueRepository.renewLeaseAsync(job.id, this.#workerId, LEASE_MS);

    while (true) {
      const deletedRows = await this.#outputsRepository.deletePendingDeletionDataBatchAsync(
        job.entityId,
        DELETE_BATCH_SIZE,
      );
      await this.#deletionQueueRepository.renewLeaseAsync(job.id, this.#workerId, LEASE_MS);
      if (deletedRows === 0) {
        break;
      }
    }

    await this.#outputsRepository.finalizePendingDeletionAsync(job.entityId);
  }

  async #processSensorJobAsync(job: DeletionQueueJob): Promise<void> {
    await this.#sensorsRepository.cleanupPendingDeletionDependenciesAsync(job.entityId);
    await this.#deletionQueueRepository.renewLeaseAsync(job.id, this.#workerId, LEASE_MS);

    while (true) {
      const deletedRows = await this.#sensorsRepository.deletePendingDeletionDataBatchAsync(
        job.entityId,
        DELETE_BATCH_SIZE,
      );
      await this.#deletionQueueRepository.renewLeaseAsync(job.id, this.#workerId, LEASE_MS);
      if (deletedRows === 0) {
        break;
      }
    }

    await this.#sensorsRepository.finalizePendingDeletionAsync(job.entityId);
  }

  async #processSubcontrollerJobAsync(job: DeletionQueueJob): Promise<boolean> {
    const childResult = await this.#subcontrollersRepository.requestChildDeletionsAsync(
      job.entityId,
      this.#deletionQueueRepository,
    );

    if (childResult.outputIds.length > 0) {
      await this.#eventBus.publishAsync(new OutputModifiedEvent({}));
    }
    if (childResult.sensorIds.length > 0) {
      await this.#eventBus.publishAsync(new SensorModifiedEvent({}));
    }

    if (childResult.remainingOutputCount > 0 || childResult.remainingSensorCount > 0) {
      await this.#deletionQueueRepository.requeueAsync(
        job.id,
        this.#workerId,
        SUBCONTROLLER_RETRY_DELAY_MS,
      );
      return false;
    }

    await this.#subcontrollersRepository.finalizePendingDeletionAsync(job.entityId);
    return true;
  }

  #getRetryDelayMs(attemptCount: number): number {
    return Math.min(60000, RETRY_DELAY_MS * Math.max(1, attemptCount));
  }
}