import { expect } from "chai";
import knex, { Knex } from "knex";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants";
import {
  buildKnexConfiguration,
  type PrefixedConnectionConfiguration,
} from "../cli/mysqlToPostgresBridgeShared";
import { runBridgePreflightAsync } from "../cli/mysqlToPostgresBridge";
import { runBridgeCutoverAsync } from "../cli/mysqlToPostgresBridgeCutover";
import { assertRuntimeDatabaseAllowedAsync } from "../database/BridgeRuntimeGuard";

type MigrationStateRow = {
  active_run_id: number | null;
  phase: string;
  authoritative_client: string;
  source_database: string | null;
  target_database: string | null;
  last_error: string | null;
};

type MigrationRunRow = {
  id: number;
  status: string;
  validation_summary: {
    success?: boolean;
    tables?: Record<string, { importedRowCount?: number }>;
    cutover?: {
      fromAuthoritativeClient?: string;
      toAuthoritativeClient?: string;
    };
  } | null;
};

describe("MySQL to PostgreSQL bridge", () => {
  const originalEnvironment = captureEnvironment([
    "NODE_ENV",
    "DATABASE_CLIENT",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
    "SOURCE_DATABASE_CLIENT",
    "SOURCE_DATABASE_HOST",
    "SOURCE_DATABASE_PORT",
    "SOURCE_DATABASE_USER",
    "SOURCE_DATABASE_PASSWORD",
    "SOURCE_DATABASE_NAME",
    "TARGET_DATABASE_CLIENT",
    "TARGET_DATABASE_HOST",
    "TARGET_DATABASE_PORT",
    "TARGET_DATABASE_USER",
    "TARGET_DATABASE_PASSWORD",
    "TARGET_DATABASE_NAME",
    "BRIDGE_BACKUP_SOURCE_BEFORE_IMPORT",
    "BRIDGE_BACKUP_TARGET_BEFORE_IMPORT",
    "BRIDGE_BACKUP_DIRECTORY",
  ]);

  const sourceConfiguration = getSourceConfiguration();
  const targetConfiguration = getTargetConfiguration();

  let sourceConnection: Knex;
  let targetConnection: Knex;

  before(async function () {
    this.timeout(0);

    applyBridgeEnvironment(sourceConfiguration, targetConfiguration);
    await recreateDatabaseAsync(sourceConfiguration);
    await recreateDatabaseAsync(targetConfiguration);

    sourceConnection = knex(buildKnexConfiguration(sourceConfiguration));
    targetConnection = knex(buildKnexConfiguration(targetConfiguration));

    await sourceConnection.migrate.latest();
    await sourceConnection.seed.run({
      directory: "dist/database/seeds",
      loadExtensions: [".js"],
      specific: "testSetup.js",
    });
    await targetConnection.migrate.latest();
  });

  after(async () => {
    await Promise.allSettled([sourceConnection?.destroy(), targetConnection?.destroy()]);
    restoreEnvironment(originalEnvironment);
  });

  it("imports validated data and completes cutover", async function () {
    this.timeout(0);

    await runBridgePreflightAsync();

    const validatedState = await getMigrationStateAsync(targetConnection);
    expect(validatedState.phase).to.equal("validated_pending_cutover");
    expect(validatedState.authoritative_client).to.equal("mysql2");
    expect(validatedState.active_run_id).to.be.a("number");

    const validatedRun = await getMigrationRunAsync(
      targetConnection,
      validatedState.active_run_id!,
    );
    expect(validatedRun.status).to.equal("validated");
    expect(validatedRun.validation_summary?.success).to.equal(true);
    expect(validatedRun.validation_summary?.tables?.["outputs"]?.importedRowCount).to.equal(2);
    expect(validatedRun.validation_summary?.tables?.["sensor_data"]?.importedRowCount).to.equal(1);

    const [sourceOutputsCount, targetOutputsCount] = await Promise.all([
      getTableCountAsync(sourceConnection, "outputs"),
      getTableCountAsync(targetConnection, "outputs"),
    ]);
    expect(targetOutputsCount).to.equal(sourceOutputsCount);

    const [sourceSensorsCount, targetSensorsCount] = await Promise.all([
      getTableCountAsync(sourceConnection, "sensors"),
      getTableCountAsync(targetConnection, "sensors"),
    ]);
    expect(targetSensorsCount).to.equal(sourceSensorsCount);

    await runBridgeCutoverAsync();

    const cutoverState = await getMigrationStateAsync(targetConnection);
    expect(cutoverState.phase).to.equal("cutover_complete");
    expect(cutoverState.authoritative_client).to.equal("pg");

    const cutoverRun = await getMigrationRunAsync(targetConnection, cutoverState.active_run_id!);
    expect(cutoverRun.status).to.equal("cutover_complete");
    expect(cutoverRun.validation_summary?.cutover?.fromAuthoritativeClient).to.equal("mysql2");
    expect(cutoverRun.validation_summary?.cutover?.toAuthoritativeClient).to.equal("pg");

    process.env["DATABASE_CLIENT"] = "pg";
    process.env["DATABASE_HOST"] = targetConfiguration.host;
    process.env["DATABASE_PORT"] = String(targetConfiguration.port);
    process.env["DATABASE_USER"] = targetConfiguration.user;
    process.env["DATABASE_PASSWORD"] = targetConfiguration.password;

    await assertRuntimeDatabaseAllowedAsync(targetConnection);
  });
});

async function getMigrationStateAsync(connection: Knex): Promise<MigrationStateRow> {
  const state = await connection<MigrationStateRow>("database_migration_state")
    .where("singleton_id", true)
    .first();
  if (!state) {
    throw new Error("Expected database_migration_state row to exist.");
  }

  return state;
}

async function getMigrationRunAsync(connection: Knex, runId: number): Promise<MigrationRunRow> {
  const run = await connection<MigrationRunRow>("database_migration_runs")
    .where("id", runId)
    .first();
  if (!run) {
    throw new Error(`Expected migration run ${runId} to exist.`);
  }

  return run;
}

async function getTableCountAsync(connection: Knex, tableName: string): Promise<number> {
  const result = await connection(tableName).count<{ count: string | number }[]>("* as count");
  const count = result[0]?.count;
  return typeof count === "number" ? count : parseInt(String(count ?? 0), 10);
}

function applyBridgeEnvironment(
  sourceConfiguration: PrefixedConnectionConfiguration,
  targetConfiguration: PrefixedConnectionConfiguration,
): void {
  process.env["NODE_ENV"] = "test";
  process.env["SOURCE_DATABASE_CLIENT"] = sourceConfiguration.client;
  process.env["SOURCE_DATABASE_HOST"] = sourceConfiguration.host;
  process.env["SOURCE_DATABASE_PORT"] = String(sourceConfiguration.port);
  process.env["SOURCE_DATABASE_USER"] = sourceConfiguration.user;
  process.env["SOURCE_DATABASE_PASSWORD"] = sourceConfiguration.password;
  process.env["SOURCE_DATABASE_NAME"] = sourceConfiguration.database;
  process.env["TARGET_DATABASE_CLIENT"] = targetConfiguration.client;
  process.env["TARGET_DATABASE_HOST"] = targetConfiguration.host;
  process.env["TARGET_DATABASE_PORT"] = String(targetConfiguration.port);
  process.env["TARGET_DATABASE_USER"] = targetConfiguration.user;
  process.env["TARGET_DATABASE_PASSWORD"] = targetConfiguration.password;
  process.env["TARGET_DATABASE_NAME"] = targetConfiguration.database;
  process.env["BRIDGE_BACKUP_SOURCE_BEFORE_IMPORT"] = "false";
  process.env["BRIDGE_BACKUP_TARGET_BEFORE_IMPORT"] = "false";
  process.env["BRIDGE_BACKUP_DIRECTORY"] = "./backups/test-bridge";
}

async function recreateDatabaseAsync(
  configuration: PrefixedConnectionConfiguration,
): Promise<void> {
  const adminConnection = knex(getAdministrativeConfiguration(configuration));

  try {
    if (configuration.client === "mysql2") {
      await adminConnection.raw(
        `DROP DATABASE IF EXISTS ${quoteMySqlIdentifier(configuration.database)}`,
      );
      await adminConnection.raw(
        `CREATE DATABASE ${quoteMySqlIdentifier(configuration.database)} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`,
      );
      return;
    }

    await terminatePostgresConnectionsAsync(adminConnection, configuration.database);
    await adminConnection.raw(
      `DROP DATABASE IF EXISTS ${quotePostgresIdentifier(configuration.database)};`,
    );
    await adminConnection.raw(
      `CREATE DATABASE ${quotePostgresIdentifier(configuration.database)};`,
    );
  } finally {
    await adminConnection.destroy();
  }
}

async function terminatePostgresConnectionsAsync(
  adminConnection: Knex,
  databaseName: string,
): Promise<void> {
  await adminConnection.raw(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = ?
       AND pid <> pg_backend_pid();`,
    [databaseName],
  );
}

function getAdministrativeConfiguration(
  configuration: PrefixedConnectionConfiguration,
): Knex.Config {
  if (configuration.client === "mysql2") {
    return {
      client: configuration.client,
      connection: {
        host: configuration.host,
        user: configuration.user,
        password: configuration.password,
        port: configuration.port,
        dateStrings: true,
        decimalNumbers: true,
      },
    };
  }

  return {
    client: configuration.client,
    connection: {
      host: configuration.host,
      user: configuration.user,
      password: configuration.password,
      port: configuration.port,
      database: "postgres",
    },
  };
}

function getSourceConfiguration(): PrefixedConnectionConfiguration {
  return {
    client: "mysql2",
    host: process.env["BRIDGE_TEST_SOURCE_HOST"] ?? process.env["DATABASE_HOST"] ?? "127.0.0.1",
    port: parseIntegerEnv("BRIDGE_TEST_SOURCE_PORT", process.env["DATABASE_PORT"] ?? "3306"),
    user: process.env["BRIDGE_TEST_SOURCE_USER"] ?? process.env["DATABASE_USER"] ?? "root",
    password:
      process.env["BRIDGE_TEST_SOURCE_PASSWORD"] ?? process.env["DATABASE_PASSWORD"] ?? "root",
    database: `${Constants.DATABASE_NAME}-bridge-source`,
  };
}

function getTargetConfiguration(): PrefixedConnectionConfiguration {
  return {
    client: "pg",
    host: process.env["BRIDGE_TEST_TARGET_HOST"] ?? "127.0.0.1",
    port: parseIntegerEnv("BRIDGE_TEST_TARGET_PORT", "5432"),
    user: process.env["BRIDGE_TEST_TARGET_USER"] ?? "postgres",
    password: process.env["BRIDGE_TEST_TARGET_PASSWORD"] ?? "postgres",
    database: `${Constants.DATABASE_NAME}-bridge-target`,
  };
}

function parseIntegerEnv(name: string, fallback: string): number {
  const rawValue = process.env[name] ?? fallback;
  const value = parseInt(rawValue, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid numeric environment value for ${name}: ${rawValue}`);
  }

  return value;
}

function captureEnvironment(keys: string[]): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(environment: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(environment)) {
    if (value == null) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

function quoteMySqlIdentifier(identifier: string): string {
  return `\`${identifier.replaceAll("`", "``")}\``;
}

function quotePostgresIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}
