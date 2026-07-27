import { assert } from "chai";
import sinon from "sinon";
import { SettingsRepository } from "../settings/SettingsRepository";
import { SETTINGS, type SettingsKey } from "../settings/SettingsSchema";

// ---------------------------------------------------------------------------
// Helpers — sinon-based Knex stubs (mirroring SprootDB.spec.ts pattern)
// ---------------------------------------------------------------------------

function createQueryBuilderStub(rows: unknown[]): any {
  const builder: any = {};
  builder.then = (onfulfilled: (value: unknown) => unknown) =>
    Promise.resolve(rows).then(onfulfilled);

  const chainMethods = [
    "select",
    "where",
    "whereRaw",
    "whereBetween",
    "whereIn",
    "whereNull",
    "whereNotNull",
    "distinct",
    "orderBy",
    "limit",
    "groupByRaw",
    "join",
    "insert",
    "del",
    "update",
    "count",
    "onConflict",
    "merge",
  ];
  for (const method of chainMethods) {
    builder[method] = sinon.stub().callsFake(() => builder);
  }

  builder.returning = sinon.stub().callsFake((_returning: string[]) => builder);
  builder.first = sinon.stub().callsFake(() => Promise.resolve(rows[0] ?? undefined));
  builder.toQuery = sinon.stub().returns("SELECT * FROM test");
  return builder;
}

function createKnexStub(rows: unknown[]): any {
  const builder = createQueryBuilderStub(rows);
  const knex: any = function (_tableName?: string) {
    return builder;
  };
  knex.raw = function (sql: string) {
    const rawObj: any = function () {
      return rawObj;
    };
    rawObj.toQuery = function () {
      return sql;
    };
    rawObj.then = (onfulfilled: (value: unknown) => unknown) =>
      Promise.resolve({ rows: [{ count: 1 }] }).then(onfulfilled);
    return rawObj;
  };
  return knex;
}

// ---------------------------------------------------------------------------
// get tests
// ---------------------------------------------------------------------------

describe("SettingsRepository", () => {
  describe("get", () => {
    it("should return the value for an existing key", async () => {
      const rows = [{ key: SETTINGS.sensors.raw_retention, value: "30 days" }];
      const knex = createKnexStub(rows);
      const repo = new SettingsRepository(knex as any);

      const result = await repo.get(SETTINGS.sensors.raw_retention);

      assert.equal(result, "30 days");
    });

    it("should return undefined for a non-existent key", async () => {
      const rows: unknown[] = [];
      const knex = createKnexStub(rows);
      const repo = new SettingsRepository(knex as any);

      const result = await repo.get(SETTINGS.sensors.raw_retention);

      assert.isUndefined(result);
    });
  });

  describe("getMany", () => {
    it("should return values for existing keys", async () => {
      const rows = [
        { key: SETTINGS.sensors.raw_retention, value: "30 days" },
        { key: SETTINGS.outputs.raw_retention, value: "60 days" },
      ];
      const knex = createKnexStub(rows);
      const repo = new SettingsRepository(knex as any);

      const result = await repo.getMany([
        SETTINGS.sensors.raw_retention,
        SETTINGS.outputs.raw_retention,
      ]);

      assert.equal(result[SETTINGS.sensors.raw_retention], "30 days");
      assert.equal(result[SETTINGS.outputs.raw_retention], "60 days");
    });

    it("should return undefined for missing keys", async () => {
      const rows = [{ key: SETTINGS.sensors.raw_retention, value: "30 days" }];
      const knex = createKnexStub(rows);
      const repo = new SettingsRepository(knex as any);

      const result = await repo.getMany([
        SETTINGS.sensors.raw_retention,
        SETTINGS.outputs.raw_retention,
      ]);

      assert.equal(result[SETTINGS.sensors.raw_retention], "30 days");
      assert.isUndefined(result[SETTINGS.outputs.raw_retention]);
    });
  });

  describe("getAll", () => {
    it("should return all settings as a map", async () => {
      const rows = [
        { key: SETTINGS.sensors.raw_retention, value: "30 days" },
        { key: SETTINGS.outputs.raw_retention, value: "60 days" },
      ];
      const knex = createKnexStub(rows);
      const repo = new SettingsRepository(knex as any);

      const result = await repo.getAll();

      assert.equal(result[SETTINGS.sensors.raw_retention], "30 days");
      assert.equal(result[SETTINGS.outputs.raw_retention], "60 days");
      assert.isUndefined(result[SETTINGS.sensors["5m_agg_retention"]]);
      assert.isUndefined(result[SETTINGS.outputs["5m_agg_retention"]]);
    });

    it("should exclude unknown keys from the result", async () => {
      const rows = [
        { key: SETTINGS.sensors.raw_retention, value: "30 days" },
        { key: "unknown.foo", value: "bar" },
      ];
      const knex = createKnexStub(rows);
      const repo = new SettingsRepository(knex as any);

      const result = await repo.getAll();

      assert.equal(result[SETTINGS.sensors.raw_retention], "30 days");
      assert.isUndefined(result[SETTINGS.sensors["5m_agg_retention"]]);
      // Verify the result has exactly the expected known keys (4 total), not unknown ones
      const keys = Object.keys(result) as SettingsKey[];
      assert.equal(keys.length, 4);
      assert.deepEqual(keys.sort(), [
        SETTINGS.outputs["5m_agg_retention"],
        SETTINGS.outputs.raw_retention,
        SETTINGS.sensors["5m_agg_retention"],
        SETTINGS.sensors.raw_retention,
      ]);
    });

    it("should return all undefined when no settings exist", async () => {
      const rows: unknown[] = [];
      const knex = createKnexStub(rows);
      const repo = new SettingsRepository(knex as any);

      const result = await repo.getAll();

      for (const key of Object.values(SETTINGS.sensors) as SettingsKey[]) {
        assert.isUndefined(result[key]);
      }
      for (const key of Object.values(SETTINGS.outputs) as SettingsKey[]) {
        assert.isUndefined(result[key]);
      }
      // Guard: ensures emptySettingsMap covers all SettingsSchema keys.
      // If a new key is added to SettingsSchema but SETTINGS isn't updated,
      // this assertion fails, surfacing the mismatch early.
      assert.equal(Object.keys(result).length, 4, "getAll must return exactly all known setting keys");
    });
  });

  describe("set", () => {
    it("should serialize and store a string value", async () => {
      const knex = createKnexStub([]);
      const repo = new SettingsRepository(knex as any);

      await repo.set(SETTINGS.sensors.raw_retention, "45 days");

      const builder = (knex as any)("settings");
      assert.isTrue(builder.insert.calledOnce);
      const insertArgs = builder.insert.firstCall.args[0];
      assert.equal(insertArgs.key, SETTINGS.sensors.raw_retention);
      assert.deepEqual(insertArgs.value, "45 days");
    });

    it("should serialize and store an object value", async () => {
      const knex = createKnexStub([]);
      const repo = new SettingsRepository(knex as any);
      const objValue = { enabled: true, threshold: 75 };

      await repo.set(SETTINGS.sensors.raw_retention, objValue as any);

      const builder = (knex as any)("settings");
      assert.isTrue(builder.insert.calledOnce);
      const insertArgs = builder.insert.firstCall.args[0];
      assert.equal(insertArgs.key, SETTINGS.sensors.raw_retention);
      assert.deepEqual(insertArgs.value, { enabled: true, threshold: 75 });
    });

    it("should upsert — call onConflict().merge() for existing key", async () => {
      const knex = createKnexStub([]);
      const repo = new SettingsRepository(knex as any);

      await repo.set(SETTINGS.sensors.raw_retention, "45 days");

      const builder = (knex as any)("settings");
      assert.isTrue(builder.insert.calledOnce);
      const insertArgs = builder.insert.firstCall.args[0];
      assert.equal(insertArgs.key, SETTINGS.sensors.raw_retention);
      assert.equal(insertArgs.value, "45 days");
      assert.isTrue(builder.onConflict.calledOnce);
      assert.equal(builder.onConflict.firstCall.args[0], "key");
      assert.isTrue(builder.merge.calledOnce);
    });
  });
});
