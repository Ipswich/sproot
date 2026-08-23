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
      existsStub.withArgs("sensors.data_retention").resolves(true);
      existsStub.callsFake(async () => false);

      await repo.syncDefaultsAsync();

      const insertedRows = insertStub.firstCall.args[0] as Array<{ key: string; value: unknown }>;

      assert.sameMembers(
        insertedRows.map((row) => row.key),
        DEFAULTS.filter((d) => d.key !== "sensors.data_retention").map((d) => d.key),
      );
      assert.equal(
        insertedRows.find((row) => row.key === "outputs.data_retention")?.value,
        JSON.stringify("2 years"),
      );
      assert.equal(
        insertedRows.find((row) => row.key === "system.backup_retention")?.value,
        JSON.stringify("30 days"),
      );
      assert.strictEqual(insertedRows.find((row) => row.key === "system.log_debug")?.value, false);
      assert.exists(insertedRows.find((row) => row.key === "system.latitude")?.value);
      assert.exists(insertedRows.find((row) => row.key === "system.longitude")?.value);
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

      const insertedRows = insertStub.firstCall.args[0] as Array<{ key: string; value: unknown }>;

      assert.sameMembers(
        insertedRows.map((row) => row.key),
        DEFAULTS.map((d) => d.key),
      );
      assert.equal(
        insertedRows.find((row) => row.key === "sensors.data_retention")?.value,
        JSON.stringify("2 years"),
      );
      assert.strictEqual(insertedRows.find((row) => row.key === "system.log_debug")?.value, false);
      assert.exists(insertedRows.find((row) => row.key === "system.latitude")?.value);
      assert.exists(insertedRows.find((row) => row.key === "system.longitude")?.value);
    });
  });
});
