import { describe, it } from "mocha";
import { assert } from "chai";
import sinon, { stub } from "sinon";
import winston from "winston";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { Events } from "../../eventbus/events/Events";
import { ISettingsRepository } from "../../database/settings/ISettingsRepository";
import type { IRetentionRepository } from "../../database/repositories/retention/IRetentionRepository";
import { RetentionService } from "../RetentionService";

describe("RetentionService", () => {
  let eventBus: MemoryEventBus;
  let logger: winston.Logger;
  let repo: sinon.SinonStubbedInstance<ISettingsRepository>;
  let retentionRepo: sinon.SinonStubbedInstance<IRetentionRepository>;
  let service: RetentionService;

  beforeEach(() => {
    eventBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    logger = winston.createLogger({ silent: true });
    repo = {
      getAsync: sinon.stub().resolves("30 days"),
      getAllAsync: sinon.stub().resolves({}),
      getManyAsync: sinon.stub().resolves({}),
      setAsync: sinon.stub().resolves(),
      existsAsync: sinon.stub().resolves(true),
      deleteAsync: sinon.stub().resolves(),
      syncDefaultsAsync: sinon.stub().resolves(),
    } as unknown as sinon.SinonStubbedInstance<ISettingsRepository>;
    retentionRepo = {
      removeRetentionPolicyAsync: sinon.stub().resolves(),
      addRetentionPolicyAsync: sinon.stub().resolves(),
      getPolicyJobIdAsync: sinon.stub().resolves(1),
      runPolicyJobAsync: sinon.stub().resolves(),
    } as unknown as sinon.SinonStubbedInstance<IRetentionRepository>;
    service = new RetentionService(repo, retentionRepo, eventBus, logger);
  });

  afterEach(() => {
    sinon.restore();
    service[Symbol.dispose]();
  });

  describe("reconcileAsync", () => {
    const reconcileMethodName = "reconcileAsync";

    it("applies retention policy for a valid sensor setting", async () => {
      repo.getAsync.resolves("30 days");

      await service.reconcileAsync("sensors.data_retention");

      // Should call remove + add for each of the 4 sensor tables
      assert.isTrue(retentionRepo.removeRetentionPolicyAsync.callCount === 4);
      assert.isTrue(retentionRepo.addRetentionPolicyAsync.callCount === 4);
      const removeCall0 = retentionRepo.removeRetentionPolicyAsync.getCall(0).args[0];
      const addCall0 = retentionRepo.addRetentionPolicyAsync.getCall(0).args[0];
      assert.equal(removeCall0, "sensor_data");
      assert.equal(addCall0, "sensor_data");
      assert.isTrue(retentionRepo.runPolicyJobAsync.called);
    });

    it("applies retention policy to all sensor tables", async () => {
      repo.getAsync.resolves("7 days");

      await service.reconcileAsync("sensors.data_retention");

      const removeCalls = retentionRepo.removeRetentionPolicyAsync.getCalls();
      const tableNames = removeCalls.map((c) => c.args[0]);
      assert.includeMembers(tableNames, [
        "sensor_data",
        "sensor_data_5m",
        "sensor_data_1h",
        "sensor_data_1d",
      ]);
    });

    it("removes retention policy when value is empty string", async () => {
      repo.getAsync.resolves("");

      await service.reconcileAsync("sensors.data_retention");

      // 4 tables × remove only = 4 calls
      assert.isTrue(retentionRepo.removeRetentionPolicyAsync.callCount === 4);
      assert.isTrue(retentionRepo.addRetentionPolicyAsync.notCalled);
    });

    it("skips reconciliation for unknown setting keys", async () => {
      await service[reconcileMethodName]("unknown.setting.key");

      assert.isTrue(retentionRepo.removeRetentionPolicyAsync.notCalled);
      assert.isTrue(retentionRepo.addRetentionPolicyAsync.notCalled);
    });

    it("logs warning for invalid duration format", async () => {
      const warnStub = sinon.stub(logger, "warn");
      repo.getAsync.resolves("not a valid duration");

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(warnStub.calledOnce);
      assert.isTrue(retentionRepo.removeRetentionPolicyAsync.notCalled);
    });

    it("removes retention policy when setting value is null", async () => {
      repo.getAsync.resolves(null as unknown as string);

      await service.reconcileAsync("sensors.data_retention");

      // 4 tables × remove only = 4 calls
      assert.isTrue(retentionRepo.removeRetentionPolicyAsync.callCount === 4);
      assert.isTrue(retentionRepo.addRetentionPolicyAsync.notCalled);
    });
  });

  describe("reconcileAllAsync", () => {
    it("reconciles all registered settings", async () => {
      repo.getAsync.resolves("30 days");

      await service.reconcileAllAsync();

      // 2 settings × 4 tables each = 8 removes, 8 adds, 8 job lookups, 8 job runs
      assert.equal(retentionRepo.removeRetentionPolicyAsync.callCount, 8);
      assert.equal(retentionRepo.addRetentionPolicyAsync.callCount, 8);
      assert.equal(retentionRepo.getPolicyJobIdAsync.callCount, 8);
      assert.equal(retentionRepo.runPolicyJobAsync.callCount, 8);
    });

    it("continues reconciling other settings when one fails", async () => {
      repo.getAsync.resolves("30 days");
      retentionRepo.removeRetentionPolicyAsync.onFirstCall().rejects(new Error("DB error"));

      await service.reconcileAllAsync();

      // 2 settings × 4 tables = 8 removes (1st fails, 7 succeed), 7 adds, 7 job lookups, 7 job runs
      assert.equal(retentionRepo.removeRetentionPolicyAsync.callCount, 8);
      assert.equal(retentionRepo.addRetentionPolicyAsync.callCount, 7);
      assert.equal(retentionRepo.getPolicyJobIdAsync.callCount, 7);
      assert.equal(retentionRepo.runPolicyJobAsync.callCount, 7);
    });
  });

  describe("event subscription", () => {
    it("reconciles on sensor.retention.updated events", async () => {
      repo.getAsync.resolves("60 days");
      const reconcileSpy = sinon.spy(service, "reconcileAsync");

      const event = {
        type: Events.SENSOR_RETENTION_UPDATED,
        payload: { key: "sensors.data_retention", value: "60 days" },
        eventId: "test-id",
        occurredAt: new Date(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await eventBus.publishAsync(event as any);

      assert.isTrue(reconcileSpy.calledOnceWith("sensors.data_retention"));
    });

    it("reconciles on output.retention.updated events", async () => {
      repo.getAsync.resolves("90 days");
      const reconcileSpy = sinon.spy(service, "reconcileAsync");

      const event = {
        type: Events.OUTPUT_RETENTION_UPDATED,
        payload: { key: "outputs.data_retention", value: "90 days" },
        eventId: "test-id",
        occurredAt: new Date(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await eventBus.publishAsync(event as any);

      assert.isTrue(reconcileSpy.calledOnceWith("outputs.data_retention"));
    });

    it("does not reconcile on backup.retention.updated events", async () => {
      repo.getAsync.resolves("30 days");
      const reconcileSpy = sinon.spy(service, "reconcileAsync");

      const event = {
        type: Events.BACKUP_RETENTION_UPDATED,
        payload: { key: "system.backup_retention", value: "30 days" },
        eventId: "test-id",
        occurredAt: new Date(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await eventBus.publishAsync(event as any);

      assert.isTrue(reconcileSpy.notCalled);
    });
  });

  describe("Symbol.dispose", () => {
    it("unsubscribes from event bus", async () => {
      repo.getAsync.resolves("30 days");
      const reconcileSpy = stub(service, "reconcileAsync").resolves();

      service[Symbol.dispose]();

      const event = {
        type: Events.SENSOR_RETENTION_UPDATED,
        payload: { key: "sensors.data_retention", value: "30 days" },
        eventId: "test-id",
        occurredAt: new Date(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await eventBus.publishAsync(event as any);

      assert.isTrue(reconcileSpy.notCalled);
    });
  });

  describe("#parseDuration", () => {
    it("accepts valid duration strings", async () => {
      repo.getAsync.resolves("30 days");
      await service.reconcileAsync("sensors.data_retention");
      assert.isTrue(retentionRepo.addRetentionPolicyAsync.called);
    });

    it("rejects zero duration", async () => {
      repo.getAsync.resolves("0 days");

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(retentionRepo.addRetentionPolicyAsync.notCalled);
    });

    it("rejects invalid units", async () => {
      repo.getAsync.resolves("30 foobars");

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(retentionRepo.addRetentionPolicyAsync.notCalled);
    });

    it("normalizes irregular whitespace to single space", async () => {
      repo.getAsync.resolves("30   days");

      await service.reconcileAsync("sensors.data_retention");

      const addCall = retentionRepo.addRetentionPolicyAsync.getCall(0).args[1];
      assert.equal(addCall, "30 days");
    });
  });

  describe("immediate job execution", () => {
    it("executes the policy job after adding a retention policy", async () => {
      repo.getAsync.resolves("30 days");
      retentionRepo.getPolicyJobIdAsync.resolves(42);

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(retentionRepo.getPolicyJobIdAsync.called);
      assert.isTrue(retentionRepo.runPolicyJobAsync.calledWith(42));
    });

    it("skips job execution when no job ID is found", async () => {
      repo.getAsync.resolves("30 days");
      retentionRepo.getPolicyJobIdAsync.resolves(null);

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(retentionRepo.getPolicyJobIdAsync.called);
      assert.isTrue(retentionRepo.runPolicyJobAsync.notCalled);
    });

    it("logs warning but continues when job execution fails", async () => {
      repo.getAsync.resolves("30 days");
      retentionRepo.getPolicyJobIdAsync.resolves(99);
      retentionRepo.runPolicyJobAsync.rejects(new Error("Job execution failed"));
      const warnStub = sinon.stub(logger, "warn");

      await service.reconcileAsync("sensors.data_retention");

      sinon.assert.calledWith(
        warnStub,
        sinon.match((msg: string) =>
          msg.includes("Failed to immediately execute retention policy"),
        ),
      );
      assert.isTrue(retentionRepo.runPolicyJobAsync.calledWith(99));
    });
  });

  describe("error handling", () => {
    it("logs warning but continues to next table when policy add fails", async () => {
      repo.getAsync.resolves("30 days");
      retentionRepo.addRetentionPolicyAsync
        .onFirstCall()
        .rejects(new Error("Policy already exists"));
      const warnStub = sinon.stub(logger, "warn");

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(warnStub.called);
      // Should still try to apply policies for remaining tables
      assert.isTrue(retentionRepo.removeRetentionPolicyAsync.callCount >= 4);
    });

    it("logs warning when removing policy fails", async () => {
      repo.getAsync.resolves("");
      retentionRepo.removeRetentionPolicyAsync.rejects(new Error("Remove failed"));
      const warnStub = sinon.stub(logger, "warn");

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(warnStub.called);
      assert.isTrue(retentionRepo.removeRetentionPolicyAsync.callCount === 4);
    });
  });
});
