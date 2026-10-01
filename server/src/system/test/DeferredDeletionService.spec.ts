import { assert } from "chai";
import sinon from "sinon";
import type { IEventBus } from "../../eventbus/IEventBus";
import { Events } from "../../eventbus/events/Events";
import {
  DeferredDeletionService,
  DeferredOutputsRepository,
  DeferredSubcontrollersRepository,
  DeferredSensorsRepository,
} from "../DeferredDeletionService";
import type {
  DeletionQueueJob,
  IDeletionQueueRepository,
} from "../../database/repositories/deletion-queue/IDeletionQueueRepository";
import winston from "winston";

describe("DeferredDeletionService", () => {
  let outputsRepository: sinon.SinonStubbedInstance<DeferredOutputsRepository>;
  let sensorsRepository: sinon.SinonStubbedInstance<DeferredSensorsRepository>;
  let subcontrollersRepository: sinon.SinonStubbedInstance<DeferredSubcontrollersRepository>;
  let deletionQueueRepository: sinon.SinonStubbedInstance<IDeletionQueueRepository>;
  let eventBus: sinon.SinonStubbedInstance<IEventBus>;
  let logger: sinon.SinonStubbedInstance<winston.Logger>;

  beforeEach(() => {
    outputsRepository = {
      getAllAsync: sinon.stub(),
      getByIdAsync: sinon.stub(),
      addAsync: sinon.stub(),
      updateAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
      requestDeletionAsync: sinon.stub().resolves("queued"),
      cleanupPendingDeletionDependenciesAsync: sinon.stub().resolves(),
      deletePendingDeletionDataBatchAsync: sinon.stub().resolves(0),
      finalizePendingDeletionAsync: sinon.stub().resolves(),
      updateLastOutputStateAsync: sinon.stub(),
      getLastOutputStateAsync: sinon.stub(),
      addOutputStateAsync: sinon.stub(),
      getOutputStatesAsync: sinon.stub(),
      getBucketedOutputStatesAsync: sinon.stub(),
      getDataAsync: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<DeferredOutputsRepository>;

    sensorsRepository = {
      getAllAsync: sinon.stub(),
      getByIdAsync: sinon.stub(),
      getDS18B20AddressesAsync: sinon.stub(),
      addAsync: sinon.stub(),
      updateAsync: sinon.stub(),
      updateSensorCalibrationAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
      requestDeletionAsync: sinon.stub().resolves("queued"),
      cleanupPendingDeletionDependenciesAsync: sinon.stub().resolves(),
      deletePendingDeletionDataBatchAsync: sinon.stub().resolves(0),
      finalizePendingDeletionAsync: sinon.stub().resolves(),
      addSensorReadingAsync: sinon.stub(),
      getSensorReadingsAsync: sinon.stub(),
      getBucketedSensorReadingsAsync: sinon.stub(),
      getDataAsync: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<DeferredSensorsRepository>;

    subcontrollersRepository = {
      getAllAsync: sinon.stub(),
      addAsync: sinon.stub(),
      updateAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
      requestDeletionAsync: sinon.stub().resolves("queued"),
      requestChildDeletionsAsync: sinon.stub().resolves({
        outputIds: [],
        sensorIds: [],
        remainingOutputCount: 0,
        remainingSensorCount: 0,
      }),
      finalizePendingDeletionAsync: sinon.stub().resolves(1),
    } as unknown as sinon.SinonStubbedInstance<DeferredSubcontrollersRepository>;

    deletionQueueRepository = {
      enqueueAsync: sinon.stub().resolves(),
      enqueueManyAsync: sinon.stub().resolves(),
      claimNextAsync: sinon.stub().resolves(null),
      renewLeaseAsync: sinon.stub().resolves(true),
      requeueAsync: sinon.stub().resolves(),
      completeAsync: sinon.stub().resolves(),
    } as unknown as sinon.SinonStubbedInstance<IDeletionQueueRepository>;

    eventBus = {
      publishAsync: sinon.stub().resolves(),
      subscribe: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<IEventBus>;

    logger = {
      error: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<winston.Logger>;
  });

  afterEach(() => {
    sinon.restore();
  });

  it("queues an output deletion without waiting for the refresh event handler", async () => {
    eventBus.publishAsync.callsFake(() => new Promise<void>(() => undefined));

    const service = await DeferredDeletionService.createInstanceAsync(
      outputsRepository,
      sensorsRepository,
      subcontrollersRepository,
      deletionQueueRepository,
      eventBus,
      logger,
    );

    const deletePromise = service.deleteOutputAsync(12).then(() => "resolved");
    const result = await Promise.race([
      deletePromise,
      new Promise<string>((resolve) => setImmediate(() => resolve("pending"))),
    ]);
    service[Symbol.dispose]();

    assert.equal(result, "resolved");
    assert.isTrue(
      outputsRepository.requestDeletionAsync.calledOnceWithExactly(12, deletionQueueRepository),
    );
    assert.isTrue(eventBus.publishAsync.calledOnce);
    assert.equal(eventBus.publishAsync.firstCall.args[0].type, Events.OUTPUT_MODIFIED_EVENT);
  });

  it("claims and processes an output cleanup job from the durable queue", async () => {
    const job: DeletionQueueJob = {
      id: 3,
      entityType: "output",
      entityId: 7,
      status: "processing",
      attemptCount: 1,
      lastError: null,
      lockedBy: "worker",
      requestedAt: new Date(),
      availableAt: new Date(),
      lockedAt: new Date(),
      lockExpiresAt: new Date(),
      finishedAt: null,
    };
    deletionQueueRepository.claimNextAsync.onFirstCall().resolves(job).onSecondCall().resolves(null);

    const service = await DeferredDeletionService.createInstanceAsync(
      outputsRepository,
      sensorsRepository,
      subcontrollersRepository,
      deletionQueueRepository,
      eventBus,
      logger,
    );
    await new Promise((resolve) => setImmediate(resolve));
    service[Symbol.dispose]();

    assert.isTrue(outputsRepository.cleanupPendingDeletionDependenciesAsync.calledOnceWithExactly(7));
    assert.isTrue(
      outputsRepository.deletePendingDeletionDataBatchAsync.calledOnceWithExactly(7, 5000),
    );
    assert.isTrue(outputsRepository.finalizePendingDeletionAsync.calledOnceWithExactly(7));
    assert.isTrue(deletionQueueRepository.completeAsync.calledOnce);
  });

  it("requeues a subcontroller job while child deletions are still pending", async () => {
    const job: DeletionQueueJob = {
      id: 5,
      entityType: "subcontroller",
      entityId: 11,
      status: "processing",
      attemptCount: 1,
      lastError: null,
      lockedBy: "worker",
      requestedAt: new Date(),
      availableAt: new Date(),
      lockedAt: new Date(),
      lockExpiresAt: new Date(),
      finishedAt: null,
    };
    deletionQueueRepository.claimNextAsync.onFirstCall().resolves(job).onSecondCall().resolves(null);
    subcontrollersRepository.requestChildDeletionsAsync.resolves({
      outputIds: [1],
      sensorIds: [2],
      remainingOutputCount: 1,
      remainingSensorCount: 1,
    });

    const service = await DeferredDeletionService.createInstanceAsync(
      outputsRepository,
      sensorsRepository,
      subcontrollersRepository,
      deletionQueueRepository,
      eventBus,
      logger,
    );
    await new Promise((resolve) => setImmediate(resolve));
    service[Symbol.dispose]();

    assert.isTrue(deletionQueueRepository.requeueAsync.calledOnce);
    assert.isTrue(deletionQueueRepository.completeAsync.notCalled);
  });
});