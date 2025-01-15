import type { Knex } from "knex";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants";
import { TypeCastField } from "mysql2";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env["DATABASE_HOST"]!,
      user: process.env["DATABASE_USER"]!,
      password: process.env["DATABASE_PASSWORD"]!,
      database: `${Constants.DATABASE_NAME}-development`,
      port: parseInt(process.env["DATABASE_PORT"]!),
      dateStrings: true,
      typeCast: castTinyIntsToBooleans,
    },
    migrations: {
      loadExtensions: [".js"],
      directory: "dist/database/migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      loadExtensions: [".js"],
      directory: "dist/database/seeds",
    },
  },

  test: {
    client: "mysql2",
    connection: {
      host: process.env["DATABASE_HOST"]!,
      user: process.env["DATABASE_USER"]!,
      password: process.env["DATABASE_PASSWORD"]!,
      database: `${Constants.DATABASE_NAME}-test`,
      port: parseInt(process.env["DATABASE_PORT"]!),
      dateStrings: true,
      typeCast: castTinyIntsToBooleans,
    },
    migrations: {
      loadExtensions: [".ts"],
      directory: "src/database/migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      loadExtensions: [".ts"],
      directory: "src/database/seeds",
    },
  },

  production: {
    client: "mysql2",
    connection: {
      host: process.env["DATABASE_HOST"]!,
      user: process.env["DATABASE_USER"]!,
      password: process.env["DATABASE_PASSWORD"]!,
      database: Constants.DATABASE_NAME,
      port: parseInt(process.env["DATABASE_PORT"]!),
      dateStrings: true,
      typeCast: castTinyIntsToBooleans,
    },
    migrations: {
      loadExtensions: [".js"],
      directory: "dist/database/migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      loadExtensions: [".js"],
      directory: "dist/database/seeds",
    },
  },
};

function castTinyIntsToBooleans(field: TypeCastField, next: () => any) {
  if (field.type == "TINY" && field.length == 1) {
    let value = field.string();
    return value ? value == "1" : null;
  }
  return next();
}

export default config;
