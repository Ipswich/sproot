import { describe, it } from "mocha";
import { assert } from "chai";
import sinon from "sinon";
import { SettingsService } from "../SettingsService";
import { ISettingsRepository } from "../../database/settings/ISettingsRepository";
import { SETTINGS } from "../../database/settings/SettingsSchema";

describe("SettingsService", () => {
  let repoStub: sinon.SinonStubbedInstance<ISettingsRepository>;
  let service: SettingsService;

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
    service = new SettingsService(mockRepo);
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
});
