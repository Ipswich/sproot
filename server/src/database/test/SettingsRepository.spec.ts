import { assert } from "chai";
import sinon from "sinon";
import { SettingsRepository } from "../settings/SettingsRepository";
import { SETTINGS } from "../settings/SettingsSchema";

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
});
