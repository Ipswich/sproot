import { Knex } from "knex";
import {
  getDatabaseClientFromEnvironment,
  isPostgresClient,
  type SupportedDatabaseClient,
} from "./DatabaseClient";

export type BridgeMigrationState = {
  activeRunId: number | null;
  phase: string;
  authoritativeClient: string;
  sourceDatabase: string | null;
  targetDatabase: string | null;
  lastError: string | null;
};

export async function assertRuntimeDatabaseAllowedAsync(connection: Knex): Promise<void> {
  const configuredClient = getDatabaseClientFromEnvironment();
  assertMySqlRuntimeIsAllowed(configuredClient, getRejectMySqlRuntimeFromEnvironment());

  if (!isPostgresClient(configuredClient)) {
    return;
  }

  const migrationState = await getBridgeMigrationStateIfPresentAsync(connection);
  assertPostgresRuntimeStateIsAllowed(migrationState);
}

export function assertMySqlRuntimeIsAllowed(
  configuredClient: SupportedDatabaseClient,
  rejectMySqlRuntime: boolean,
): void {
  if (configuredClient === "mysql2" && rejectMySqlRuntime) {
    throw new Error(
      "This release no longer supports MySQL runtime. Upgrade through the v0.3.0 bridge release and cut over to PostgreSQL first.",
    );
  }
}

export function assertPostgresRuntimeStateIsAllowed(
  migrationState: BridgeMigrationState | null,
): void {
  if (migrationState == null) {
    return;
  }

  if (migrationState.authoritativeClient === "pg" && migrationState.phase === "cutover_complete") {
    return;
  }

  const details = [
    `phase=${migrationState.phase}`,
    `authoritative_client=${migrationState.authoritativeClient}`,
    migrationState.lastError ? `last_error=${migrationState.lastError}` : null,
  ]
    .filter((detail) => detail != null)
    .join(", ");

  throw new Error(
    `PostgreSQL runtime is not ready because bridge cutover is incomplete. ${details}. Complete validation and cutover before starting the server on PostgreSQL.`,
  );
}

export function getRejectMySqlRuntimeFromEnvironment(): boolean {
  const value = process.env["REJECT_MYSQL_RUNTIME"]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export async function getBridgeMigrationStateIfPresentAsync(
  connection: Knex,
): Promise<BridgeMigrationState | null> {
  const tableExistsResult = await connection.raw(
    "SELECT to_regclass('public.database_migration_state') AS table_name",
  );
  const tableName = tableExistsResult.rows?.[0]?.table_name as string | null | undefined;
  if (!tableName) {
    return null;
  }

  const migrationState = await connection("database_migration_state")
    .select(
      "active_run_id as activeRunId",
      "phase",
      "authoritative_client as authoritativeClient",
      "source_database as sourceDatabase",
      "target_database as targetDatabase",
      "last_error as lastError",
    )
    .where("singleton_id", true)
    .first<BridgeMigrationState>();

  return migrationState ?? null;
}
