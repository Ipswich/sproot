import * as Constants from "@sproot/sproot-common/dist/utility/Constants";
import { Knex } from "knex";
import {
  getDefaultPortForClient,
  getMigrationDirectoryForClient,
  normalizeDatabaseClient,
} from "../database/DatabaseClient";

export type PrefixedConnectionConfiguration = {
  client: "mysql2" | "pg";
  host: string;
  user: string;
  password: string;
  port: number;
  database: string;
};

export type MigrationRunStatus =
  | "running"
  | "imported"
  | "validated"
  | "cutover_complete"
  | "failed";

export type MigrationStateUpdate = {
  activeRunId: number | null;
  phase: string;
  authoritativeClient: string;
  sourceDatabase: string | null;
  targetDatabase: string | null;
  lastError: string | null;
};

export function getConnectionConfigurationFromPrefix(
  prefix: string,
): PrefixedConnectionConfiguration {
  const client = normalizeDatabaseClient(process.env[`${prefix}DATABASE_CLIENT`]);
  const host = getRequiredEnvironmentVariable(`${prefix}DATABASE_HOST`);
  const user = getRequiredEnvironmentVariable(`${prefix}DATABASE_USER`);
  const password = getRequiredEnvironmentVariable(`${prefix}DATABASE_PASSWORD`);
  const database =
    process.env[`${prefix}DATABASE_NAME`] ??
    `${Constants.DATABASE_NAME}${getDatabaseSuffixForNodeEnv()}`;
  const port = getPrefixedDatabasePort(prefix, client);

  return {
    client,
    host,
    user,
    password,
    port,
    database,
  };
}

export function buildKnexConfiguration(
  configuration: PrefixedConnectionConfiguration,
): Knex.Config {
  return {
    client: configuration.client,
    connection: {
      host: configuration.host,
      user: configuration.user,
      password: configuration.password,
      port: configuration.port,
      database: configuration.database,
      ...(configuration.client === "mysql2" ? { dateStrings: true, decimalNumbers: true } : {}),
    },
    pool: {
      min: 0,
      max: 2,
    },
    migrations: {
      loadExtensions: [".js"],
      directory: getMigrationDirectoryForClient(configuration.client, ".js"),
      tableName: "knex_migrations",
    },
  };
}

export async function ensureMigrationMetadataAsync(connection: Knex): Promise<void> {
  await connection.raw(`
    CREATE TABLE IF NOT EXISTS database_migration_runs (
      id BIGSERIAL PRIMARY KEY,
      source_client TEXT NOT NULL,
      source_database TEXT NOT NULL,
      target_database TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ NULL,
      validation_summary JSONB NULL,
      error_message TEXT NULL
    );
  `);

  await connection.raw(`
    CREATE TABLE IF NOT EXISTS database_migration_state (
      singleton_id BOOLEAN PRIMARY KEY DEFAULT TRUE,
      active_run_id BIGINT NULL REFERENCES database_migration_runs(id) ON DELETE SET NULL,
      phase TEXT NOT NULL,
      authoritative_client TEXT NOT NULL,
      source_database TEXT NULL,
      target_database TEXT NULL,
      last_error TEXT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (singleton_id)
    );
  `);

  await connection.raw(`
    INSERT INTO database_migration_state (
      singleton_id,
      active_run_id,
      phase,
      authoritative_client,
      source_database,
      target_database,
      last_error,
      updated_at
    )
    VALUES (TRUE, NULL, 'preflight', 'mysql2', NULL, current_database(), NULL, NOW())
    ON CONFLICT (singleton_id)
    DO NOTHING;
  `);
}

export async function updateMigrationRunAsync(
  connection: Knex,
  runId: number,
  status: MigrationRunStatus,
  validationSummary?: Record<string, unknown> | null,
  errorMessage?: string | null,
): Promise<void> {
  await connection("database_migration_runs")
    .where("id", runId)
    .update({
      status,
      updated_at: connection.fn.now(),
      completed_at: status === "running" ? null : connection.fn.now(),
      validation_summary: validationSummary ?? null,
      error_message: errorMessage ?? null,
    });
}

export async function updateMigrationStateAsync(
  connection: Knex,
  state: MigrationStateUpdate,
): Promise<void> {
  await connection("database_migration_state").where("singleton_id", true).update({
    active_run_id: state.activeRunId,
    phase: state.phase,
    authoritative_client: state.authoritativeClient,
    source_database: state.sourceDatabase,
    target_database: state.targetDatabase,
    last_error: state.lastError,
    updated_at: connection.fn.now(),
  });
}

export async function acquireTargetLockAsync(connection: Knex): Promise<void> {
  const result = await connection.raw("SELECT pg_try_advisory_lock(873224511019) AS locked");
  const locked = result.rows?.[0]?.locked;
  if (!locked) {
    throw new Error("Could not acquire PostgreSQL advisory lock for bridge migration.");
  }
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getPrefixedDatabasePort(prefix: string, client: "mysql2" | "pg"): number {
  const rawPort = process.env[`${prefix}DATABASE_PORT`];
  if (!rawPort) {
    return getDefaultPortForClient(client);
  }

  const port = parseInt(rawPort, 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid ${prefix}DATABASE_PORT value: ${rawPort}`);
  }

  return port;
}

function getDatabaseSuffixForNodeEnv(): string {
  switch (process.env["NODE_ENV"]?.toLowerCase()) {
    case "development":
      return "-development";
    case "test":
      return "-test";
    default:
      return "";
  }
}
