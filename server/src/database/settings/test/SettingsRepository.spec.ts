import { describe, it } from "mocha";
import { assert } from "chai";
import { SinonSandbox, SinonStub, createSandbox } from "sinon";

import { SettingsRepository } from "../SettingsRepository";
import { DEFAULTS } from "../SettingsDefaults";

describe("SettingsRepository", () => {
  let sandbox: SinonSandbox;
  let mockKnex: SinonStub;
  let insertStub: SinonStub;
  let repo: SettingsRepository;

  beforeEach(() => {
    sandbox = createSandbox();
    mockKnex = sandbox.stub();

    // Knex query chain: knex("settings").insert(rows).onConflict("key").merge()
    // mockKnex("settings") returns the stub itself (which has .insert)
    const insertChain: any = sandbox.stub();
    const mergeStub = sandbox.stub().resolves();
    const onConflictResult: any = sandbox.stub();
    onConflictResult.merge = mergeStub;
    insertChain.onConflict = sandbox.stub().returns(onConflictResult);
    insertStub = sandbox.stub().returns(insertChain);
    (mockKnex as any).insert = insertStub;
    mockKnex.returns(mockKnex);

    repo = new SettingsRepository(mockKnex as any);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("syncDefaultsAsync", () => {
    it("should insert defaults for keys that do not exist", async () => {
      const existsStub = sandbox.stub(repo as any, "existsAsync");
      existsStub.withArgs("sensors.raw_retention").resolves(true);
      existsStub.callsFake(async () => false);

      await repo.syncDefaultsAsync();

      const expectedRows = DEFAULTS.filter((d) => d.key !== "sensors.raw_retention").map((d) => ({
        key: d.key,
        value: typeof d.value === "string" ? JSON.stringify(d.value) : d.value,
        description: d.description,
        editable: d.editable,
      }));

      assert.isTrue(insertStub.calledWith(expectedRows));
    });

    it("should not insert when all defaults already exist", async () => {
      const existsStub = sandbox.stub(repo as any, "existsAsync");
      existsStub.resolves(true);

      await repo.syncDefaultsAsync();

      assert.isFalse(insertStub.called);
    });

    it("should insert all defaults when none exist", async () => {
      const existsStub = sandbox.stub(repo as any, "existsAsync");
      existsStub.resolves(false);

      await repo.syncDefaultsAsync();

      const expectedRows = DEFAULTS.map((d) => ({
        key: d.key,
        value: typeof d.value === "string" ? JSON.stringify(d.value) : d.value,
        description: d.description,
        editable: d.editable,
      }));

      assert.isTrue(insertStub.calledWith(expectedRows));
    });
  });
});
