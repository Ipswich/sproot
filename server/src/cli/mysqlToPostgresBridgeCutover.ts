import "dotenv/config";
import knex, { Knex } from "knex";
import {
  acquireTargetLockAsync,
  buildKnexConfiguration,
  ensureMigrationMetadataAsync,
  getConnectionConfigurationFromPrefix,
  updateMigrationRunAsync,
  updateMigrationStateAsync,
  type MigrationRunStatus,
} from "./mysqlToPostgresBridgeShared";

type ValidationSummary = {
  success?: boolean;
  [key: string]: unknown;
};

type DatabaseMigrationRunRow = {
  id: number;
  source_database: string;
  target_database: string;
  status: MigrationRunStatus;
  validation_summary: ValidationSummary | null;
};

type DatabaseMigrationStateRow = {
  active_run_id: number | null;
  phase: string;
  authoritative_client: string;
  source_database: string | null;
  target_database: string | null;
};

export async function runBridgeCutoverAsync(): Promise<void> {
  const targetConfiguration = getConnectionConfigurationFromPrefix("TARGET_");
  if (targetConfiguration.client !== "pg") {
    throw new Error("TARGET_DATABASE_CLIENT must resolve to pg for the bridge cutover command.");
  }

  console.info("Starting PostgreSQL bridge cutover...");
  const targetConnection = knex(buildKnexConfiguration(targetConfiguration));

  try {
    await ensureMigrationMetadataAsync(targetConnection);
    await targetConnection.migrate.latest();
    await acquireTargetLockAsync(targetConnection);

    const migrationState = await getMigrationStateAsync(targetConnection);
    const migrationRun = await getCutoverEligibleMigrationRunAsync(
      targetConnection,
      migrationState,
    );

    try {
      await updateMigrationStateAsync(targetConnection, {
        activeRunId: migrationRun.id,
        phase: "cutover_in_progress",
        authoritativeClient: "mysql2",
        sourceDatabase: migrationRun.source_database,
        targetDatabase: migrationRun.target_database,
        lastError: null,
      });

      const updatedValidationSummary = {
        ...(migrationRun.validation_summary ?? {}),
        cutoverAt: new Date().toISOString(),
        cutover: {
          fromAuthoritativeClient: "mysql2",
          toAuthoritativeClient: "pg",
        },
      };

      await updateMigrationRunAsync(
        targetConnection,
        migrationRun.id,
        "cutover_complete",
        updatedValidationSummary,
        null,
      );
      await updateMigrationStateAsync(targetConnection, {
        activeRunId: migrationRun.id,
        phase: "cutover_complete",
        authoritativeClient: "pg",
        sourceDatabase: migrationRun.source_database,
        targetDatabase: migrationRun.target_database,
        lastError: null,
      });

      console.info("Bridge cutover completed successfully.");
      console.info("PostgreSQL is now marked authoritative in bridge migration metadata.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await updateMigrationStateAsync(targetConnection, {
        activeRunId: migrationRun.id,
        phase: "cutover_failed",
        authoritativeClient: "mysql2",
        sourceDatabase: migrationRun.source_database,
        targetDatabase: migrationRun.target_database,
        lastError: errorMessage,
      });
      throw error;
    }
  } finally {
    await targetConnection.destroy();
  }
}

async function getMigrationStateAsync(connection: Knex): Promise<DatabaseMigrationStateRow> {
  const migrationState = await connection<DatabaseMigrationStateRow>("database_migration_state")
    .where("singleton_id", true)
    .first();
  if (!migrationState) {
    throw new Error("Bridge migration state was not found in PostgreSQL.");
  }

  return migrationState;
}

async function getCutoverEligibleMigrationRunAsync(
  connection: Knex,
  migrationState: DatabaseMigrationStateRow,
): Promise<DatabaseMigrationRunRow> {
  if (!["validated_pending_cutover", "cutover_failed"].includes(migrationState.phase)) {
    throw new Error(
      `Cutover requires phase validated_pending_cutover or cutover_failed. Current phase: ${migrationState.phase}`,
    );
  }

  if (migrationState.authoritative_client !== "mysql2") {
    throw new Error(
      `Cutover requires mysql2 to remain authoritative. Current authoritative client: ${migrationState.authoritative_client}`,
    );
  }

  if (migrationState.active_run_id == null) {
    throw new Error("Cutover requires an active validated migration run.");
  }

  const migrationRun = await connection<DatabaseMigrationRunRow>("database_migration_runs")
    .where("id", migrationState.active_run_id)
    .first();
  if (!migrationRun) {
    throw new Error(`Migration run ${migrationState.active_run_id} was not found.`);
  }

  if (migrationRun.status !== "validated") {
    throw new Error(
      `Cutover requires a validated migration run. Current status: ${migrationRun.status}`,
    );
  }

  if (migrationRun.validation_summary?.success !== true) {
    throw new Error(
      "Cutover requires a successful validation summary on the active migration run.",
    );
  }

  return migrationRun;
}

if (require.main === module) {
  void runBridgeCutoverAsync().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
