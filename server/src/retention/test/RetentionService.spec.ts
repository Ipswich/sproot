import { describe, it } from "mocha";
import { assert } from "chai";
import sinon from "sinon";
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
    it("applies retention policy for a valid sensor setting", async () => {
      repo.getAsync.resolves("30 days");

      await service.reconcileAsync("sensors.raw_retention");

      assert.isTrue(knex.raw.calledTwice);
      const firstCall = knex.raw.firstCall.args[0];
      const secondCall = knex.raw.secondCall.args[0];
      assert.include(firstCall, "remove_retention_policy");
      assert.include(firstCall, "sensor_data");
      assert.include(secondCall, "add_retention_policy");
      assert.include(secondCall, "sensor_data");
      assert.include(secondCall, "INTERVAL '30 days'");
    });

    it("applies retention policy for a continuous aggregate", async () => {
      repo.getAsync.resolves("7 days");

      await service.reconcileAsync("sensors.5m_agg_retention");

      const addCall = knex.raw.secondCall.args[0];
      assert.include(addCall, "sensor_data_5m");
      assert.include(addCall, "INTERVAL '7 days'");
    });

    it("skips policy application when value is empty string", async () => {
      repo.getAsync.resolves("");

      await service.reconcileAsync("sensors.raw_retention");

      assert.isTrue(knex.raw.notCalled);
    });

    it("skips reconciliation for unknown setting keys", async () => {
      await service.reconcileAsync("unknown.setting.key");

      assert.isTrue(knex.raw.notCalled);
    });

    it("logs warning for invalid duration format", async () => {
      const warnStub = sinon.stub(logger, "warn");
      repo.getAsync.resolves("not a valid duration");

      await service.reconcileAsync("sensors.raw_retention");

      assert.isTrue(warnStub.calledOnce);
      assert.isTrue(knex.raw.notCalled);
    });

    it("handles null setting values as empty string", async () => {
      repo.getAsync.resolves(null as unknown as string);

      await service.reconcileAsync("sensors.raw_retention");

      assert.isTrue(knex.raw.notCalled);
    });
  });

  describe("reconcileAllAsync", () => {
    it("reconciles all registered settings", async () => {
      repo.getAsync.resolves("30 days");
      const reconcileMethodName = "reconcileAsync";
      const spy = sinon.spy(service, reconcileMethodName);

      await service.reconcileAllAsync();

      assert.isTrue(spy.callCount === 8);
      const calledKeys = spy.getCalls().map((call) => call.args[0]);
      assert.includeMembers(calledKeys, [
        "sensors.raw_retention",
        "outputs.raw_retention",
        "sensors.5m_agg_retention",
        "outputs.1d_agg_retention",
      ]);
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
      const reconcileMethodName = "reconcileAsync";
      const reconcileSpy = sinon.spy(service, reconcileMethodName);

      const event = {
        type: Events.SENSOR_RETENTION_UPDATED,
        payload: { key: "sensors.raw_retention", value: "60 days" },
        eventId: "test-id",
        occurredAt: new Date(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await eventBus.publishAsync(event as any);

      assert.isTrue(reconcileSpy.calledOnceWith("sensors.raw_retention"));
    });

    it("reconciles on output.retention.updated events", async () => {
      repo.getAsync.resolves("90 days");
      const reconcileMethodName = "reconcileAsync";
      const reconcileSpy = sinon.spy(service, reconcileMethodName);

      const event = {
        type: Events.OUTPUT_RETENTION_UPDATED,
        payload: { key: "outputs.1d_agg_retention", value: "90 days" },
        eventId: "test-id",
        occurredAt: new Date(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await eventBus.publishAsync(event as any);

      assert.isTrue(reconcileSpy.calledOnceWith("outputs.1d_agg_retention"));
    });

    it("does not reconcile on backup.retention.updated events", async () => {
      repo.getAsync.resolves("30 days");
      const reconcileMethodName = "reconcileAsync";
      const reconcileSpy = sinon.spy(service, reconcileMethodName);

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
      const reconcileMethodName = "reconcileAsync";
      const reconcileSpy = sinon.stub(service, reconcileMethodName).resolves();

      service[Symbol.dispose]();

      const event = {
        type: Events.SENSOR_RETENTION_UPDATED,
        payload: { key: "sensors.raw_retention", value: "30 days" },
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
      await service.reconcileAsync("sensors.raw_retention");
      assert.isTrue(knex.raw.called);
    });

    it("rejects zero duration", async () => {
      repo.getAsync.resolves("0 days");

      await service.reconcileAsync("sensors.raw_retention");

      assert.isTrue(knex.raw.notCalled);
    });

    it("rejects invalid units", async () => {
      repo.getAsync.resolves("30 foobars");

      await service.reconcileAsync("sensors.raw_retention");

      assert.isTrue(knex.raw.notCalled);
    });
  });
});
