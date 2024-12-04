import type { Knex } from "knex";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "mysql2",
    connection: {
      host: "db",
      user: "root",
      password: "root",
      database: `${Constants.DATABASE_NAME}-development`,
      port: 3306,
      dateStrings: true,
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
      host: "db",
      user: "root",
      password: "root",
      database: `${Constants.DATABASE_NAME}-test`,
      port: 3306,
      dateStrings: true,
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

export default config;
