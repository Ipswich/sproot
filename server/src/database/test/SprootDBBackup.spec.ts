import { assert } from "chai";
import { readFileSync } from "fs";
import path from "path";

describe("SprootDB pg_dump format", () => {
  const sourcePath = path.resolve(process.cwd(), "src/database/SprootDB.ts");

  it("should use --format=custom for TimescaleDB compatibility", () => {
    const source = readFileSync(sourcePath, "utf-8");

    assert.include(
      source,
      "--format=custom",
      "pg_dump should use custom format for TimescaleDB hypertable compatibility",
    );
  });

  it("should use --compress=9 for maximum compression", () => {
    const source = readFileSync(sourcePath, "utf-8");

    assert.include(
      source,
      "--compress=9",
      "pg_dump should use maximum compression level",
    );
  });

  it("should not use --format=plain in backupDatabaseArchiveAsync", () => {
    const source = readFileSync(sourcePath, "utf-8");

    const methodMatch = source.match(/async #backupDatabaseArchiveAsync[\s\S]*?#restoreDatabaseArchiveAsync/);

    assert.isDefined(methodMatch, "backupDatabaseArchiveAsync method should exist in source");

    const backupMethod = methodMatch![0];
    assert.isFalse(
      backupMethod.includes("--format=plain"),
      "pg_dump should not use plain format anymore",
    );
  });

  describe("restore via pg_restore with TimescaleDB hooks", () => {
    it("should use pg_restore instead of psql for restore", () => {
      const source = readFileSync(sourcePath, "utf-8");

      const restoreMatch = source.match(
        /async #restoreDatabaseArchiveAsync[\s\S]*?(?:#buildDatabaseDumpErrorMessage|}$)/,
      );

      assert.isDefined(restoreMatch, "restoreDatabaseArchiveAsync method should exist in source");

      const restoreMethod = restoreMatch![0];
      assert.include(restoreMethod, "pg_restore", "restore should use pg_restore instead of psql");
      assert.isFalse(
        restoreMethod.includes('spawn("psql"'),
        "restore should not use psql directly",
      );
    });

    it("should call timescaledb_pre_restore before restore", () => {
      const source = readFileSync(sourcePath, "utf-8");

      const restoreMatch = source.match(
        /async #restoreDatabaseArchiveAsync[\s\S]*?(?:#buildDatabaseDumpErrorMessage|}$)/,
      );

      assert.isDefined(restoreMatch, "restoreDatabaseArchiveAsync method should exist in source");

      assert.include(
        restoreMatch![0],
        "timescaledb_pre_restore",
        "restore should call timescaledb_pre_restore hook",
      );
    });

    it("should call timescaledb_post_restore after restore", () => {
      const source = readFileSync(sourcePath, "utf-8");

      const restoreMatch = source.match(
        /async #restoreDatabaseArchiveAsync[\s\S]*?(?:#buildDatabaseDumpErrorMessage|}$)/,
      );

      assert.isDefined(restoreMatch, "restoreDatabaseArchiveAsync method should exist in source");

      assert.include(
        restoreMatch![0],
        "timescaledb_post_restore",
        "restore should call timescaledb_post_restore hook",
      );
    });

    it("should have #runTimescaleHookAsync helper method", () => {
      const source = readFileSync(sourcePath, "utf-8");

      assert.include(
        source,
        "async #runTimescaleHookAsync",
        "SprootDB should have #runTimescaleHookAsync helper method",
      );
    });

    it("should have #restoreViaPgRestoreAsync helper method", () => {
      const source = readFileSync(sourcePath, "utf-8");

      assert.include(
        source,
        "async #restoreViaPgRestoreAsync",
        "SprootDB should have #restoreViaPgRestoreAsync helper method",
      );
    });

    it("should use --clean, --if-exists, and --single-transaction flags in pg_restore", () => {
      const source = readFileSync(sourcePath, "utf-8");

      assert.include(source, "--clean", "pg_restore should use --clean flag");
      assert.include(source, "--if-exists", "pg_restore should use --if-exists flag");
      assert.include(source, "--single-transaction", "pg_restore should use --single-transaction flag");
    });
  });
});
