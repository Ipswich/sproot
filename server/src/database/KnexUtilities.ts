import { getKnexConfigForEnvironment } from "../knexfile";
import knex, { Knex } from "knex";
import {
  getAdministrativeDatabaseName,
  getDatabaseClientFromEnvironment,
  isMySqlClient,
  isPostgresClient,
  type SupportedDatabaseClient,
} from "./DatabaseClient";

export type KnexConnectionOptions = {
  ensureDatabase?: boolean;
  runMigrations?: boolean;
  runSeeds?: boolean;
};

export async function getKnexConnectionAsync(
  options: KnexConnectionOptions = {},
): Promise<Knex<any, unknown>> {
  const config = getKnexConfigForEnvironment(process.env["NODE_ENV"]);
  if (!config) {
    throw new Error("Invalid NODE_ENV, could not find knex configuration.");
  }
  const mergedOptions: Required<KnexConnectionOptions> = {
    ensureDatabase: options.ensureDatabase ?? true,
    runMigrations: options.runMigrations ?? true,
    runSeeds: options.runSeeds ?? true,
  };

  if (mergedOptions.ensureDatabase) {
    await createDatabaseIfNotExistsAsync(config);
  }

  const connection = knex(config);
  if (mergedOptions.runMigrations) {
    await connection.migrate.latest();
  }

  if (mergedOptions.runSeeds) {
    await seedDatabaseAsync(connection);
  }

  return connection;
}

async function createDatabaseIfNotExistsAsync(config: Knex.Config): Promise<boolean> {
  const connectionConfiguration = { ...(config.connection as Record<string, unknown>) };
  const databaseName = connectionConfiguration["database"] as string | undefined;
  if (!databaseName) {
    throw new Error("Knex configuration is missing a database name.");
  }

  const client = getDatabaseClientFromEnvironment();
  const adminConfig: Knex.Config = {
    ...config,
    connection: buildAdministrativeConnectionConfig(connectionConfiguration, client),
  };

  const adminConnection = knex(adminConfig);

  try {
    const databaseExists = await databaseExistsAsync(adminConnection, client, databaseName);
    if (databaseExists) {
      return false;
    }

    await createDatabaseAsync(adminConnection, client, databaseName);
    return true;
  } finally {
    await adminConnection.destroy();
  }
}

async function seedDatabaseAsync(connection: Knex) {
  if (process.env["NODE_ENV"] == "test") {
    await connection.seed.run({ specific: `testSetup.ts` });
  }
}

export function setTableDefaults(table: Knex.CreateTableBuilder) {
  if (isMySqlClient(getDatabaseClientFromEnvironment())) {
    table.engine("InnoDB");
    table.charset("utf8mb4");
    table.collate("utf8mb4_general_ci");
  }
}

function buildAdministrativeConnectionConfig(
  connectionConfiguration: Record<string, unknown>,
  client: SupportedDatabaseClient,
): Record<string, unknown> {
  if (isMySqlClient(client)) {
    const mysqlAdminConfiguration = { ...connectionConfiguration };
    delete mysqlAdminConfiguration["database"];
    return mysqlAdminConfiguration;
  }

  return {
    ...connectionConfiguration,
    database: getAdministrativeDatabaseName(client),
  };
}

async function databaseExistsAsync(
  adminConnection: Knex,
  client: SupportedDatabaseClient,
  databaseName: string,
): Promise<boolean> {
  if (isMySqlClient(client)) {
    return (
      (await adminConnection.from("information_schema.SCHEMATA").where("SCHEMA_NAME", databaseName))
        .length !== 0
    );
  }

  if (isPostgresClient(client)) {
    const result = await adminConnection("pg_database").where("datname", databaseName).first();
    return result != null;
  }

  throw new Error(`Unsupported database client: ${client}`);
}

async function createDatabaseAsync(
  adminConnection: Knex,
  client: SupportedDatabaseClient,
  databaseName: string,
): Promise<void> {
  if (isMySqlClient(client)) {
    await adminConnection.raw(
      `CREATE DATABASE \`${databaseName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`,
    );
    return;
  }

  if (isPostgresClient(client)) {
    await adminConnection.raw(`CREATE DATABASE ${quotePostgresIdentifier(databaseName)};`);
    return;
  }

  throw new Error(`Unsupported database client: ${client}`);
}

function quotePostgresIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}
