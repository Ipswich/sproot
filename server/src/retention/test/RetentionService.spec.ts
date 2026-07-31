import { describe, it } from "mocha";
import { assert } from "chai";
import sinon, { stub } from "sinon";
import winston from "winston";
import { Knex } from "knex";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { Events } from "../../eventbus/events/Events";
import { ISettingsRepository } from "../../database/settings/ISettingsRepository";
import { RetentionService } from "../RetentionService";

describe("RetentionService", () => {
  let eventBus: MemoryEventBus;
  let knex: sinon.SinonStubbedInstance<Knex>;
  let logger: winston.Logger;
  let repo: sinon.SinonStubbedInstance<ISettingsRepository>;
  let service: RetentionService;

  beforeEach(() => {
    eventBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    knex = {
      raw: sinon.stub().resolves(),
    } as unknown as sinon.SinonStubbedInstance<Knex>;
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
    service = new RetentionService(eventBus, knex as unknown as Knex, logger, repo);
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
      assert.isTrue(knex.raw.callCount === 8);
      const call0 = knex.raw.getCall(0).args[0];
      const call1 = knex.raw.getCall(1).args[0];
      assert.include(call0, "remove_retention_policy");
      assert.include(call0, "sensor_data");
      assert.include(call1, "add_retention_policy");
      assert.include(call1, "INTERVAL '30 days'");
    });

    it("applies retention policy to all sensor tables", async () => {
      repo.getAsync.resolves("7 days");

      await service.reconcileAsync("sensors.data_retention");

      const calls = knex.raw.getCalls();
      const callStrings = calls.map((c) => c.args[0]);
      assert.isTrue(callStrings.some((s) => s.includes("sensor_data_5m")));
      assert.isTrue(callStrings.some((s) => s.includes("sensor_data_1h")));
      assert.isTrue(callStrings.some((s) => s.includes("sensor_data_1d")));
    });

    it("removes retention policy when value is empty string", async () => {
      repo.getAsync.resolves("");

      await service.reconcileAsync("sensors.data_retention");

      // 4 tables × remove only = 4 calls
      assert.isTrue(knex.raw.callCount === 4);
      assert.isTrue(
        knex.raw.getCalls().every((c: any) => c.args[0].includes("remove_retention_policy")),
      );
    });

    it("skips reconciliation for unknown setting keys", async () => {
      await service[reconcileMethodName]("unknown.setting.key");

      assert.isTrue(knex.raw.notCalled);
    });

    it("logs warning for invalid duration format", async () => {
      const warnStub = sinon.stub(logger, "warn");
      repo.getAsync.resolves("not a valid duration");

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(warnStub.calledOnce);
      assert.isTrue(knex.raw.notCalled);
    });

    it("removes retention policy when setting value is null", async () => {
      repo.getAsync.resolves(null as unknown as string);

      await service.reconcileAsync("sensors.data_retention");

      // 4 tables × remove only = 4 calls
      assert.isTrue(knex.raw.callCount === 4);
      assert.isTrue(knex.raw.firstCall.args[0].includes("remove_retention_policy"));
    });
  });

  describe("reconcileAllAsync", () => {
    it("reconciles all registered settings", async () => {
      repo.getAsync.resolves("30 days");
      const spy = sinon.spy(service, "reconcileAsync");

      await service.reconcileAllAsync();

      assert.isTrue(spy.callCount === 2);
      const calledKeys = spy.getCalls().map((call) => call.args[0]);
      assert.includeMembers(calledKeys, ["sensors.data_retention", "outputs.data_retention"]);
    });

    it("continues reconciling other settings when one fails", async () => {
      repo.getAsync.resolves("30 days");
      knex.raw.onFirstCall().rejects(new Error("DB error"));

      await service.reconcileAllAsync();

      assert.isTrue(knex.raw.callCount >= 2);
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
      assert.isTrue(knex.raw.called);
    });

    it("rejects zero duration", async () => {
      repo.getAsync.resolves("0 days");

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(knex.raw.notCalled);
    });

    it("rejects invalid units", async () => {
      repo.getAsync.resolves("30 foobars");

      await service.reconcileAsync("sensors.data_retention");

      assert.isTrue(knex.raw.notCalled);
    });

    it("normalizes irregular whitespace to single space", async () => {
      repo.getAsync.resolves("30   days");

      await service.reconcileAsync("sensors.data_retention");

      const addCall = knex.raw.secondCall.args[0];
      assert.include(addCall, "INTERVAL '30 days'");
    });
  });
});
