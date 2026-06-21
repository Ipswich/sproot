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
});
