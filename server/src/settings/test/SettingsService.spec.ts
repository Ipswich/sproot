import { describe, it } from "mocha";
import { assert } from "chai";
import sinon from "sinon";
import { SettingsService } from "../SettingsService";
import { ISettingsRepository } from "../../database/settings/ISettingsRepository";
import { SETTINGS } from "../../database/settings/SettingsSchema";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { Events } from "../../eventbus/events/Events";
import winston from "winston";

describe("SettingsService", () => {
  let repoStub: sinon.SinonStubbedInstance<ISettingsRepository>;
  let service: SettingsService;
  let eventBus: MemoryEventBus;

  let mockRepo: ISettingsRepository;

  beforeEach(() => {
    mockRepo = {
      getAllAsync: sinon.stub().resolves({
        [SETTINGS.sensors.raw_retention]: undefined,
        [SETTINGS.outputs.raw_retention]: undefined,
        [SETTINGS.sensors["5m_agg_retention"]]: undefined,
        [SETTINGS.outputs["5m_agg_retention"]]: undefined,
      }),
      getAsync: sinon.stub().callsFake(async (_key) => undefined),
      getManyAsync: sinon.stub().resolves({}),
      setAsync: sinon.stub().resolves(),
      existsAsync: sinon.stub().resolves(true),
      deleteAsync: sinon.stub().resolves(),
      syncDefaultsAsync: sinon.stub().resolves(),
    };
    eventBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    service = new SettingsService(mockRepo, eventBus);
    repoStub = mockRepo as unknown as sinon.SinonStubbedInstance<ISettingsRepository>;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("getAllAsync", () => {
    it("should delegate to repo.getAllAsync", async () => {
      await service.getAllAsync();
      assert.isTrue(repoStub.getAllAsync.calledOnce);
    });
  });

  describe("getAsync", () => {
    it("should delegate to repo.getAsync with the provided key", async () => {
      await service.getAsync(SETTINGS.sensors.raw_retention);
      assert.isTrue(repoStub.getAsync.calledOnceWith(SETTINGS.sensors.raw_retention));
    });
  });

  describe("getManyAsync", () => {
    it("should delegate to repo.getManyAsync with the provided keys", async () => {
      const keys = [SETTINGS.sensors.raw_retention, SETTINGS.outputs.raw_retention];
      await service.getManyAsync(keys);
      assert.isTrue(repoStub.getManyAsync.calledOnceWith(keys));
    });
  });

  describe("setAsync", () => {
    it("should delegate to repo.setAsync with the provided key and value", async () => {
      await service.setAsync(SETTINGS.sensors.raw_retention, "30 days");
      assert.isTrue(repoStub.setAsync.calledOnceWith(SETTINGS.sensors.raw_retention, "30 days"));
    });
  });

  describe("existsAsync", () => {
    it("should delegate to repo.existsAsync with the provided key", async () => {
      await service.existsAsync("some.key");
      assert.isTrue(repoStub.existsAsync.calledOnceWith("some.key"));
    });
  });

  describe("deleteAsync", () => {
    it("should delegate to repo.deleteAsync with the provided key", async () => {
      await service.deleteAsync("some.key");
      assert.isTrue(repoStub.deleteAsync.calledOnceWith("some.key"));
    });
  });

  describe("syncDefaultsAsync", () => {
    it("should delegate to repo.syncDefaultsAsync", async () => {
      await service.syncDefaultsAsync();
      assert.isTrue(repoStub.syncDefaultsAsync.calledOnce);
    });
  });

  describe("setAsync event publishing", () => {
    it("publishes sensor.retention.updated for sensors.* settings", async () => {
      const handler = sinon.stub().resolves();
      eventBus.subscribe(Events.SENSOR_RETENTION_UPDATED, handler);

      await service.setAsync(SETTINGS.sensors.raw_retention, "30 days");

      assert.isTrue(repoStub.setAsync.calledOnceWith(SETTINGS.sensors.raw_retention, "30 days"));
      assert.isTrue(handler.calledOnce);
      assert.strictEqual(handler.firstCall.args[0].type, Events.SENSOR_RETENTION_UPDATED);
      assert.strictEqual(handler.firstCall.args[0].payload.key, SETTINGS.sensors.raw_retention);
      assert.strictEqual(handler.firstCall.args[0].payload.value, "30 days");
    });

    it("publishes output.retention.updated for outputs.* settings", async () => {
      const handler = sinon.stub().resolves();
      eventBus.subscribe(Events.OUTPUT_RETENTION_UPDATED, handler);

      await service.setAsync(SETTINGS.outputs.raw_retention, "60 days");

      assert.isTrue(handler.calledOnce);
      assert.strictEqual(handler.firstCall.args[0].type, Events.OUTPUT_RETENTION_UPDATED);
      assert.strictEqual(handler.firstCall.args[0].payload.key, SETTINGS.outputs.raw_retention);
    });

    it("publishes backup.retention.updated for system.* settings", async () => {
      const handler = sinon.stub().resolves();
      eventBus.subscribe(Events.BACKUP_RETENTION_UPDATED, handler);

      await service.setAsync(SETTINGS.system.backup_retention, "30 days");

      assert.isTrue(handler.calledOnce);
      assert.strictEqual(handler.firstCall.args[0].type, Events.BACKUP_RETENTION_UPDATED);
      assert.strictEqual(handler.firstCall.args[0].payload.key, SETTINGS.system.backup_retention);
    });

    it("publishes after repo.setAsync succeeds", async () => {
      let repoCalled = false;
      (mockRepo.setAsync as sinon.SinonStub).callsFake(async () => {
        repoCalled = true;
      });
      const handler = sinon.stub().resolves();
      eventBus.subscribe(Events.SENSOR_RETENTION_UPDATED, handler);

      await service.setAsync(SETTINGS.sensors.raw_retention, "30 days");

      assert.isTrue(repoCalled);
      assert.isTrue(handler.calledOnce);
    });
  });
});
