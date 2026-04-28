import type { Knex } from "knex";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants";
import { TypeCastField } from "mysql2";
import {
  getDatabaseClientFromEnvironment,
  getMigrationDirectoryForClient,
  getDatabasePortFromEnvironment,
  isMySqlClient,
} from "./database/DatabaseClient";

function getConnectionConfiguration(
  databaseSuffix: string,
): Knex.MySqlConnectionConfig | Knex.PgConnectionConfig {
  const client = getDatabaseClientFromEnvironment();
  const databaseName =
    process.env["DATABASE_NAME"] ?? `${Constants.DATABASE_NAME}${databaseSuffix}`;
  const baseConnection = {
    host: process.env["DATABASE_HOST"]!,
    user: process.env["DATABASE_USER"]!,
    password: process.env["DATABASE_PASSWORD"]!,
    database: databaseName,
    port: getDatabasePortFromEnvironment(client),
  };

  if (isMySqlClient(client)) {
    return {
      ...baseConnection,
      dateStrings: true,
      typeCast: castTinyIntsToBooleans,
      decimalNumbers: true,
    };
  }

  return baseConnection;
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
  const client = getDatabaseClientFromEnvironment();
  return {
    client,
    pool: poolConfig,
    connection: getConnectionConfiguration(databaseSuffix),
    migrations: {
      loadExtensions: [migrationExtension],
      directory: getMigrationDirectoryForClient(client, migrationExtension),
      tableName: "knex_migrations",
    },
    seeds: {
      loadExtensions: [migrationExtension],
      directory: migrationExtension === ".ts" ? "src/database/seeds" : "dist/database/seeds",
    },
  };
}

const config: { [key: string]: Knex.Config } = {
  development: getConfigForSuffix("-development", ".js"),
  test: getConfigForSuffix("-test", ".ts"),
  production: getConfigForSuffix("", ".js"),
};

function castTinyIntsToBooleans(field: TypeCastField, next: () => any) {
  if (field.type == "TINY" && field.length == 1) {
    let value = field.string();
    return value ? value == "1" : null;
  }
  return next();
}

export default config;
