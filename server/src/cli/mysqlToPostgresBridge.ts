import "dotenv/config";
import knex, { Knex } from "knex";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import { SprootDB } from "../database/SprootDB";
import {
  acquireTargetLockAsync,
  buildKnexConfiguration,
  ensureMigrationMetadataAsync,
  getConnectionConfigurationFromPrefix,
  updateMigrationRunAsync,
  updateMigrationStateAsync,
} from "./mysqlToPostgresBridgeShared";

type TableCopyStrategy = "all" | "by-id";

type TableCopyConfiguration = {
  tableName: string;
  strategy: TableCopyStrategy;
  booleanColumns?: string[];
  foreignKeyChecks?: ForeignKeyValidationCheck[];
  sequenceColumn?: string;
  customSort?: (rows: Array<Record<string, unknown>>) => Array<Record<string, unknown>>;
};

type ForeignKeyValidationCheck = {
  columnName: string;
  referencedTable: string;
  referencedColumn?: string;
};

type TableAggregateSummary = {
  rowCount: number;
  minId: number | null;
  maxId: number | null;
};

type TableValidationSummary = {
  source: TableAggregateSummary;
  target: TableAggregateSummary;
  importedRowCount: number;
  foreignKeyChecks: ForeignKeyValidationSummary[];
  matches: boolean;
  mismatches: string[];
};

type ForeignKeyValidationSummary = {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  sourceOrphanCount: number;
  targetOrphanCount: number;
  matches: boolean;
};

type ValidationSummary = {
  validatedAt: string;
  success: boolean;
  checkedTables: number;
  mismatchedTables: string[];
  tables: Record<string, TableValidationSummary>;
};

type BridgeBackupConfiguration = {
  backupDirectory: string;
  sourceEnabled: boolean;
  targetEnabled: boolean;
};

type BackupArtifactSummary = {
  client: "mysql2" | "pg";
  database: string;
  filePath: string;
  createdAt: string;
};

type BridgeBackupSummary = {
  source: BackupArtifactSummary | null;
  target: BackupArtifactSummary | null;
};

const INSERT_BATCH_SIZE = 500;

const TABLE_COPY_CONFIGURATIONS: TableCopyConfiguration[] = [
  { tableName: "automations", strategy: "all", booleanColumns: ["enabled"], sequenceColumn: "id" },
  { tableName: "automation_tags", strategy: "all" },
  { tableName: "users", strategy: "all" },
  { tableName: "device_zones", strategy: "all", sequenceColumn: "id" },
  { tableName: "subcontrollers", strategy: "all", sequenceColumn: "id" },
  {
    tableName: "outputs",
    strategy: "all",
    booleanColumns: ["isPwm", "isInvertedPwm"],
    foreignKeyChecks: [
      { columnName: "subcontroller_id", referencedTable: "subcontrollers" },
      { columnName: "deviceZoneId", referencedTable: "device_zones" },
      { columnName: "parentOutputId", referencedTable: "outputs" },
    ],
    sequenceColumn: "id",
    customSort: (rows) =>
      [...rows].sort((left, right) => {
        const leftParentId = normalizeNullableNumber(left["parentOutputId"]);
        const rightParentId = normalizeNullableNumber(right["parentOutputId"]);
        if (leftParentId == null && rightParentId != null) {
          return -1;
        }
        if (leftParentId != null && rightParentId == null) {
          return 1;
        }

        return normalizeComparableNumber(left["id"]) - normalizeComparableNumber(right["id"]);
      }),
  },
  {
    tableName: "sensors",
    strategy: "all",
    foreignKeyChecks: [
      { columnName: "subcontroller_id", referencedTable: "subcontrollers" },
      { columnName: "deviceZoneId", referencedTable: "device_zones" },
    ],
    sequenceColumn: "id",
  },
  {
    tableName: "camera_settings",
    strategy: "all",
    booleanColumns: ["enabled", "timelapseEnabled"],
    sequenceColumn: "id",
  },
  {
    tableName: "output_data",
    strategy: "by-id",
    foreignKeyChecks: [{ columnName: "output_id", referencedTable: "outputs" }],
    sequenceColumn: "id",
  },
  {
    tableName: "sensor_data",
    strategy: "by-id",
    foreignKeyChecks: [{ columnName: "sensor_id", referencedTable: "sensors" }],
    sequenceColumn: "id",
  },
  {
    tableName: "output_actions",
    strategy: "all",
    foreignKeyChecks: [
      { columnName: "automation_id", referencedTable: "automations" },
      { columnName: "output_id", referencedTable: "outputs" },
    ],
    sequenceColumn: "id",
  },
  {
    tableName: "notification_actions",
    strategy: "all",
    foreignKeyChecks: [{ columnName: "automation_id", referencedTable: "automations" }],
    sequenceColumn: "id",
  },
  {
    tableName: "sensor_conditions",
    strategy: "all",
    foreignKeyChecks: [
      { columnName: "automation_id", referencedTable: "automations" },
      { columnName: "sensor_id", referencedTable: "sensors" },
    ],
    sequenceColumn: "id",
  },
  {
    tableName: "output_conditions",
    strategy: "all",
    foreignKeyChecks: [
      { columnName: "automation_id", referencedTable: "automations" },
      { columnName: "output_id", referencedTable: "outputs" },
    ],
    sequenceColumn: "id",
  },
  {
    tableName: "time_conditions",
    strategy: "all",
    foreignKeyChecks: [{ columnName: "automation_id", referencedTable: "automations" }],
    sequenceColumn: "id",
  },
  {
    tableName: "weekday_conditions",
    strategy: "all",
    foreignKeyChecks: [{ columnName: "automation_id", referencedTable: "automations" }],
    sequenceColumn: "id",
  },
  {
    tableName: "month_conditions",
    strategy: "all",
    foreignKeyChecks: [{ columnName: "automation_id", referencedTable: "automations" }],
    sequenceColumn: "id",
  },
  {
    tableName: "date_range_conditions",
    strategy: "all",
    foreignKeyChecks: [{ columnName: "automation_id", referencedTable: "automations" }],
    sequenceColumn: "id",
  },
  {
    tableName: "automation_tag_lookup",
    strategy: "all",
    foreignKeyChecks: [
      { columnName: "automation_id", referencedTable: "automations" },
      { columnName: "tag", referencedTable: "automation_tags", referencedColumn: "tag" },
    ],
  },
  { tableName: "journals", strategy: "all", booleanColumns: ["archived"], sequenceColumn: "id" },
  { tableName: "journal_tags", strategy: "all", sequenceColumn: "id" },
  {
    tableName: "journal_entries",
    strategy: "by-id",
    foreignKeyChecks: [{ columnName: "journal_id", referencedTable: "journals" }],
    sequenceColumn: "id",
  },
  {
    tableName: "journal_tag_lookup",
    strategy: "all",
    foreignKeyChecks: [
      { columnName: "journal_id", referencedTable: "journals" },
      { columnName: "tag_id", referencedTable: "journal_tags" },
    ],
    sequenceColumn: "id",
  },
  { tableName: "journal_entry_tags", strategy: "all", sequenceColumn: "id" },
  {
    tableName: "journal_entry_tag_lookup",
    strategy: "all",
    foreignKeyChecks: [
      { columnName: "journal_entry_id", referencedTable: "journal_entries" },
      { columnName: "tag_id", referencedTable: "journal_entry_tags" },
    ],
    sequenceColumn: "id",
  },
];

export async function runBridgePreflightAsync(): Promise<void> {
  const sourceConfiguration = getConnectionConfigurationFromPrefix("SOURCE_");
  const targetConfiguration = getConnectionConfigurationFromPrefix("TARGET_");
  const bridgeBackupConfiguration = getBridgeBackupConfigurationFromEnvironment();

  if (sourceConfiguration.client !== "mysql2") {
    throw new Error("SOURCE_DATABASE_CLIENT must resolve to mysql2 for the bridge migrator.");
  }

  if (targetConfiguration.client !== "pg") {
    throw new Error("TARGET_DATABASE_CLIENT must resolve to pg for the bridge migrator.");
  }

  console.info("Starting MySQL to PostgreSQL bridge migration...");
  const sourceConnection = knex(buildKnexConfiguration(sourceConfiguration));
  const targetConnection = knex(buildKnexConfiguration(targetConfiguration));

  try {
    await verifySourceDatabaseConnectivityAsync(sourceConnection);
    await ensureMigrationMetadataAsync(targetConnection);
    await targetConnection.migrate.latest();
    await acquireTargetLockAsync(targetConnection);
    const migrationRunId = await createMigrationRunAsync(
      targetConnection,
      sourceConfiguration.database,
      targetConfiguration.database,
    );
    let backupSummary: BridgeBackupSummary | null = null;

    try {
      if (bridgeBackupConfiguration.sourceEnabled || bridgeBackupConfiguration.targetEnabled) {
        await updateMigrationStateAsync(targetConnection, {
          activeRunId: migrationRunId,
          phase: "backing_up",
          authoritativeClient: "mysql2",
          sourceDatabase: sourceConfiguration.database,
          targetDatabase: targetConfiguration.database,
          lastError: null,
        });

        backupSummary = await createPreflightBackupsAsync(
          sourceConnection,
          targetConnection,
          sourceConfiguration,
          targetConfiguration,
          bridgeBackupConfiguration,
        );
        await updateMigrationRunAsync(targetConnection, migrationRunId, "running", {
          preflightBackups: backupSummary,
        });
      }

      await updateMigrationStateAsync(targetConnection, {
        activeRunId: migrationRunId,
        phase: "importing",
        authoritativeClient: "mysql2",
        sourceDatabase: sourceConfiguration.database,
        targetDatabase: targetConfiguration.database,
        lastError: null,
      });

      await truncateTargetTablesAsync(targetConnection);
      const tableImportSummary = await importTablesAsync(sourceConnection, targetConnection);
      await reseedTargetSequencesAsync(targetConnection);

      await updateMigrationStateAsync(targetConnection, {
        activeRunId: migrationRunId,
        phase: "validating",
        authoritativeClient: "mysql2",
        sourceDatabase: sourceConfiguration.database,
        targetDatabase: targetConfiguration.database,
        lastError: null,
      });

      const validationSummary = await validateImportedDataAsync(
        sourceConnection,
        targetConnection,
        tableImportSummary,
      );

      if (!validationSummary.success) {
        throw new Error(
          `Bridge validation failed for tables: ${validationSummary.mismatchedTables.join(", ")}`,
        );
      }

      await updateMigrationRunAsync(targetConnection, migrationRunId, "validated", {
        ...validationSummary,
        preflightBackups: backupSummary,
      });
      await updateMigrationStateAsync(targetConnection, {
        activeRunId: migrationRunId,
        phase: "validated_pending_cutover",
        authoritativeClient: "mysql2",
        sourceDatabase: sourceConfiguration.database,
        targetDatabase: targetConfiguration.database,
        lastError: null,
      });

      console.info("Bridge import and validation completed successfully.");
      console.info(
        "PostgreSQL contains validated data and remains non-authoritative pending cutover.",
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await updateMigrationRunAsync(
        targetConnection,
        migrationRunId,
        "failed",
        backupSummary ? { preflightBackups: backupSummary } : null,
        errorMessage,
      );
      await updateMigrationStateAsync(targetConnection, {
        activeRunId: migrationRunId,
        phase: "failed",
        authoritativeClient: "mysql2",
        sourceDatabase: sourceConfiguration.database,
        targetDatabase: targetConfiguration.database,
        lastError: errorMessage,
      });
      throw error;
    }
  } finally {
    await Promise.allSettled([sourceConnection.destroy(), targetConnection.destroy()]);
  }
}

async function createPreflightBackupsAsync(
  sourceConnection: Knex,
  targetConnection: Knex,
  sourceConfiguration: ReturnType<typeof getConnectionConfigurationFromPrefix>,
  targetConfiguration: ReturnType<typeof getConnectionConfigurationFromPrefix>,
  backupConfiguration: BridgeBackupConfiguration,
): Promise<BridgeBackupSummary> {
  await fsPromises.mkdir(backupConfiguration.backupDirectory, { recursive: true });

  const sourceBackup = backupConfiguration.sourceEnabled
    ? await createBackupArtifactAsync(
        sourceConnection,
        sourceConfiguration,
        backupConfiguration.backupDirectory,
        "source",
      )
    : null;
  const targetBackup = backupConfiguration.targetEnabled
    ? await createBackupArtifactAsync(
        targetConnection,
        targetConfiguration,
        backupConfiguration.backupDirectory,
        "target",
      )
    : null;

  return {
    source: sourceBackup,
    target: targetBackup,
  };
}

async function createBackupArtifactAsync(
  connection: Knex,
  configuration: ReturnType<typeof getConnectionConfigurationFromPrefix>,
  backupDirectory: string,
  role: "source" | "target",
): Promise<BackupArtifactSummary> {
  const timestamp = createFileSystemSafeTimestamp(new Date());
  const backupFilePath = path.join(
    backupDirectory,
    `bridge-${role}-${configuration.client}-${configuration.database}-${timestamp}.sproot.gz`,
  );

  console.info(`Creating ${role} backup at ${backupFilePath}...`);
  const sprootDB = new SprootDB(connection);
  await sprootDB.backupDatabaseAsync(
    configuration.host,
    configuration.port,
    configuration.user,
    configuration.password,
    backupFilePath,
  );

  return {
    client: configuration.client,
    database: configuration.database,
    filePath: backupFilePath,
    createdAt: new Date().toISOString(),
  };
}

async function verifySourceDatabaseConnectivityAsync(connection: Knex): Promise<void> {
  await connection.raw("SELECT 1");
}

async function createMigrationRunAsync(
  connection: Knex,
  sourceDatabase: string,
  targetDatabase: string,
): Promise<number> {
  const result = await connection("database_migration_runs")
    .insert({
      source_client: "mysql2",
      source_database: sourceDatabase,
      target_database: targetDatabase,
      status: "running",
    })
    .returning<Array<{ id: number | string | bigint }>>("id");

  const runId = normalizeNumericIdentifier(result[0]?.id);
  if (runId == null) {
    throw new Error("Failed to create a database migration run record.");
  }

  return runId;
}

function normalizeNumericIdentifier(value: number | string | bigint | undefined): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return value;
  }

  if (typeof value === "bigint") {
    const normalizedValue = Number(value);
    return Number.isSafeInteger(normalizedValue) ? normalizedValue : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const normalizedValue = Number.parseInt(value, 10);
    return Number.isSafeInteger(normalizedValue) ? normalizedValue : null;
  }

  return null;
}

async function truncateTargetTablesAsync(connection: Knex): Promise<void> {
  const tableNames = TABLE_COPY_CONFIGURATIONS.map((configuration) => configuration.tableName).join(
    ", ",
  );
  await connection.raw(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
}

async function importTablesAsync(
  sourceConnection: Knex,
  targetConnection: Knex,
): Promise<Record<string, number>> {
  const importedRowCounts: Record<string, number> = {};

  for (const configuration of TABLE_COPY_CONFIGURATIONS) {
    console.info(`Importing ${configuration.tableName}...`);
    const importedCount = await importTableAsync(sourceConnection, targetConnection, configuration);
    importedRowCounts[configuration.tableName] = importedCount;
    console.info(`Imported ${importedCount} rows into ${configuration.tableName}.`);
  }

  return importedRowCounts;
}

async function validateImportedDataAsync(
  sourceConnection: Knex,
  targetConnection: Knex,
  importedRowCounts: Record<string, number>,
): Promise<ValidationSummary> {
  const tableValidationSummaries: Record<string, TableValidationSummary> = {};
  const mismatchedTables: string[] = [];

  for (const configuration of TABLE_COPY_CONFIGURATIONS) {
    const [sourceSummary, targetSummary] = await Promise.all([
      getTableAggregateSummaryAsync(sourceConnection, configuration),
      getTableAggregateSummaryAsync(targetConnection, configuration),
    ]);
    const foreignKeyChecks = await getForeignKeyValidationSummariesAsync(
      sourceConnection,
      targetConnection,
      configuration,
    );

    const mismatches = getTableMismatches(
      configuration,
      importedRowCounts[configuration.tableName] ?? 0,
      sourceSummary,
      targetSummary,
      foreignKeyChecks,
    );

    tableValidationSummaries[configuration.tableName] = {
      source: sourceSummary,
      target: targetSummary,
      importedRowCount: importedRowCounts[configuration.tableName] ?? 0,
      foreignKeyChecks,
      matches: mismatches.length === 0,
      mismatches,
    };

    if (mismatches.length > 0) {
      mismatchedTables.push(configuration.tableName);
    }
  }

  return {
    validatedAt: new Date().toISOString(),
    success: mismatchedTables.length === 0,
    checkedTables: TABLE_COPY_CONFIGURATIONS.length,
    mismatchedTables,
    tables: tableValidationSummaries,
  };
}

async function importTableAsync(
  sourceConnection: Knex,
  targetConnection: Knex,
  configuration: TableCopyConfiguration,
): Promise<number> {
  if (configuration.strategy === "by-id") {
    return importTableByIdAsync(sourceConnection, targetConnection, configuration);
  }

  const rows = await sourceConnection(configuration.tableName).select("*");
  const normalizedRows = normalizeRows(rows, configuration);
  await insertRowsInBatchesAsync(targetConnection, configuration.tableName, normalizedRows);
  return normalizedRows.length;
}

async function importTableByIdAsync(
  sourceConnection: Knex,
  targetConnection: Knex,
  configuration: TableCopyConfiguration,
): Promise<number> {
  const idColumn = configuration.sequenceColumn;
  if (!idColumn) {
    throw new Error(`Table ${configuration.tableName} requires a sequenceColumn for by-id import.`);
  }

  let lastSeenId = 0;
  let importedRowCount = 0;

  while (true) {
    const rows = await sourceConnection(configuration.tableName)
      .select("*")
      .where(idColumn, ">", lastSeenId)
      .orderBy(idColumn, "asc")
      .limit(INSERT_BATCH_SIZE);

    if (rows.length === 0) {
      break;
    }

    const normalizedRows = normalizeRows(rows, configuration);
    await insertRowsInBatchesAsync(targetConnection, configuration.tableName, normalizedRows);
    importedRowCount += normalizedRows.length;
    lastSeenId = normalizeComparableNumber(normalizedRows[normalizedRows.length - 1]?.[idColumn]);
  }

  return importedRowCount;
}

async function getTableAggregateSummaryAsync(
  connection: Knex,
  configuration: TableCopyConfiguration,
): Promise<TableAggregateSummary> {
  const countResult = await connection(configuration.tableName).count<{ count: string | number }[]>(
    "* as count",
  );
  const rowCount = normalizeComparableNumber(countResult[0]?.count);

  if (!configuration.sequenceColumn) {
    return {
      rowCount,
      minId: null,
      maxId: null,
    };
  }

  const [minResult, maxResult] = await Promise.all([
    connection(configuration.tableName).min<{ min: string | number | null }[]>(
      `${configuration.sequenceColumn} as min`,
    ),
    connection(configuration.tableName).max<{ max: string | number | null }[]>(
      `${configuration.sequenceColumn} as max`,
    ),
  ]);

  return {
    rowCount,
    minId: normalizeNullableNumber(minResult[0]?.min),
    maxId: normalizeNullableNumber(maxResult[0]?.max),
  };
}

function getTableMismatches(
  configuration: TableCopyConfiguration,
  importedRowCount: number,
  sourceSummary: TableAggregateSummary,
  targetSummary: TableAggregateSummary,
  foreignKeyChecks: ForeignKeyValidationSummary[],
): string[] {
  const mismatches: string[] = [];

  if (importedRowCount !== sourceSummary.rowCount) {
    mismatches.push(
      `imported row count ${importedRowCount} did not match source row count ${sourceSummary.rowCount}`,
    );
  }

  if (targetSummary.rowCount !== sourceSummary.rowCount) {
    mismatches.push(
      `target row count ${targetSummary.rowCount} did not match source row count ${sourceSummary.rowCount}`,
    );
  }

  if (configuration.sequenceColumn) {
    if (targetSummary.minId !== sourceSummary.minId) {
      mismatches.push(
        `target minimum ${configuration.sequenceColumn} ${String(
          targetSummary.minId,
        )} did not match source minimum ${String(sourceSummary.minId)}`,
      );
    }

    if (targetSummary.maxId !== sourceSummary.maxId) {
      mismatches.push(
        `target maximum ${configuration.sequenceColumn} ${String(
          targetSummary.maxId,
        )} did not match source maximum ${String(sourceSummary.maxId)}`,
      );
    }
  }

  for (const foreignKeyCheck of foreignKeyChecks) {
    if (foreignKeyCheck.sourceOrphanCount > 0) {
      mismatches.push(
        `source orphan count for ${foreignKeyCheck.columnName} -> ${foreignKeyCheck.referencedTable}.${foreignKeyCheck.referencedColumn} was ${foreignKeyCheck.sourceOrphanCount}`,
      );
    }

    if (foreignKeyCheck.targetOrphanCount > 0) {
      mismatches.push(
        `target orphan count for ${foreignKeyCheck.columnName} -> ${foreignKeyCheck.referencedTable}.${foreignKeyCheck.referencedColumn} was ${foreignKeyCheck.targetOrphanCount}`,
      );
    }
  }

  return mismatches;
}

async function getForeignKeyValidationSummariesAsync(
  sourceConnection: Knex,
  targetConnection: Knex,
  configuration: TableCopyConfiguration,
): Promise<ForeignKeyValidationSummary[]> {
  const foreignKeyChecks = configuration.foreignKeyChecks ?? [];

  return Promise.all(
    foreignKeyChecks.map(async (foreignKeyCheck) => {
      const referencedColumn = foreignKeyCheck.referencedColumn ?? "id";
      const [sourceOrphanCount, targetOrphanCount] = await Promise.all([
        countOrphanedRowsAsync(
          sourceConnection,
          configuration.tableName,
          foreignKeyCheck,
          referencedColumn,
        ),
        countOrphanedRowsAsync(
          targetConnection,
          configuration.tableName,
          foreignKeyCheck,
          referencedColumn,
        ),
      ]);

      return {
        columnName: foreignKeyCheck.columnName,
        referencedTable: foreignKeyCheck.referencedTable,
        referencedColumn,
        sourceOrphanCount,
        targetOrphanCount,
        matches: sourceOrphanCount === 0 && targetOrphanCount === 0,
      };
    }),
  );
}

async function countOrphanedRowsAsync(
  connection: Knex,
  tableName: string,
  foreignKeyCheck: ForeignKeyValidationCheck,
  referencedColumn: string,
): Promise<number> {
  const result = await connection({ child: tableName })
    .leftJoin(
      { parent: foreignKeyCheck.referencedTable },
      `child.${foreignKeyCheck.columnName}`,
      `parent.${referencedColumn}`,
    )
    .whereNotNull(`child.${foreignKeyCheck.columnName}`)
    .whereNull(`parent.${referencedColumn}`)
    .count<{ count: string | number }[]>("* as count");

  return normalizeComparableNumber(result[0]?.count);
}

function normalizeRows(
  rows: Array<Record<string, unknown>>,
  configuration: TableCopyConfiguration,
): Array<Record<string, unknown>> {
  const normalizedRows = rows.map((row) => {
    const copy = { ...row };
    for (const columnName of configuration.booleanColumns ?? []) {
      if (columnName in copy) {
        copy[columnName] = normalizeBoolean(copy[columnName]);
      }
    }
    return copy;
  });

  return configuration.customSort ? configuration.customSort(normalizedRows) : normalizedRows;
}

async function insertRowsInBatchesAsync(
  connection: Knex,
  tableName: string,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  for (let startIndex = 0; startIndex < rows.length; startIndex += INSERT_BATCH_SIZE) {
    const batch = rows.slice(startIndex, startIndex + INSERT_BATCH_SIZE);
    if (batch.length > 0) {
      await connection(tableName).insert(batch);
    }
  }
}

async function reseedTargetSequencesAsync(connection: Knex): Promise<void> {
  for (const configuration of TABLE_COPY_CONFIGURATIONS) {
    if (!configuration.sequenceColumn) {
      continue;
    }

    const sequenceResult = await connection.raw(
      "SELECT pg_get_serial_sequence(?, ?) AS sequence_name",
      [configuration.tableName, configuration.sequenceColumn],
    );
    const sequenceName = sequenceResult.rows?.[0]?.sequence_name as string | null | undefined;

    if (!sequenceName) {
      continue;
    }

    const maxIdResult = await connection(configuration.tableName).max<
      { max: number | string | null }[]
    >(`${configuration.sequenceColumn} as max`);
    const maxId = normalizeNullableNumber(maxIdResult[0]?.max);

    if (maxId == null) {
      await connection.raw("SELECT setval(?, 1, false)", [sequenceName]);
      continue;
    }

    await connection.raw("SELECT setval(?, ?, true)", [sequenceName, maxId]);
  }
}

function normalizeBoolean(value: unknown): boolean | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }

  return Boolean(value);
}

function normalizeComparableNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return parseInt(value, 10);
  }

  return 0;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  return normalizeComparableNumber(value);
}

function getBridgeBackupConfigurationFromEnvironment(): BridgeBackupConfiguration {
  return {
    backupDirectory: process.env["BRIDGE_BACKUP_DIRECTORY"]?.trim() || "./backups/bridge",
    sourceEnabled: getBooleanEnvironmentVariable("BRIDGE_BACKUP_SOURCE_BEFORE_IMPORT"),
    targetEnabled: getBooleanEnvironmentVariable("BRIDGE_BACKUP_TARGET_BEFORE_IMPORT"),
  };
}

function getBooleanEnvironmentVariable(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function createFileSystemSafeTimestamp(date: Date): string {
  return date.toISOString().replaceAll(":", "-");
}

if (require.main === module) {
  void runBridgePreflightAsync().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
