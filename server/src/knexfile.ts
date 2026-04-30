import type { Knex } from "knex";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants";

const DATABASE_DEFAULT_PORT = 5432;

function getMigrationDirectory(extension: ".js" | ".ts"): string {
  const sourceRoot = extension === ".ts" ? "src" : "dist";
  return `${sourceRoot}/database/migrations`;
}

function getDatabasePort(): number {
  const rawPort = process.env["DATABASE_PORT"];
  if (!rawPort) {
    return DATABASE_DEFAULT_PORT;
  }

  const port = parseInt(rawPort, 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid DATABASE_PORT value: ${rawPort}`);
  }

  return port;
}

function getConnectionConfiguration(databaseSuffix: string): Knex.StaticConnectionConfig {
  const databaseName =
    process.env["DATABASE_NAME"] ?? `${Constants.DATABASE_NAME}${databaseSuffix}`;
  return {
    host: process.env["DATABASE_HOST"]!,
    user: process.env["DATABASE_USER"]!,
    password: process.env["DATABASE_PASSWORD"]!,
    database: databaseName,
    port: getDatabasePort(),
  };
}

const poolConfig = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 10000,
  idleTimeoutMillis: 60000,
  reapIntervalMillis: 30000,
};

function getConfigForSuffix(
  databaseSuffix: string,
  migrationExtension: ".js" | ".ts",
): Knex.Config {
  return {
    client: "pg",
    pool: poolConfig,
    connection: getConnectionConfiguration(databaseSuffix),
    migrations: {
      loadExtensions: [migrationExtension],
      directory: getMigrationDirectory(migrationExtension),
      tableName: "knex_migrations",
    },
    seeds: {
      loadExtensions: [migrationExtension],
      directory: migrationExtension === ".ts" ? "src/database/seeds" : "dist/database/seeds",
    },
  };
}

export function getKnexConfigForEnvironment(
  environmentName: string | undefined,
): Knex.Config | undefined {
  switch (environmentName?.toLowerCase()) {
    case "development":
      return getConfigForSuffix("-development", ".js");
    case "test":
      return getConfigForSuffix("-test", ".js");
    case "production":
      return getConfigForSuffix("", ".js");
    default:
      return undefined;
  }
}

const config: { [key: string]: Knex.Config } = {
  development: getKnexConfigForEnvironment("development")!,
  test: getKnexConfigForEnvironment("test")!,
  production: getKnexConfigForEnvironment("production")!,
};

export default config;
