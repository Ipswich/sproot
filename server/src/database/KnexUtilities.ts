import knexConfig from "../knexfile";
import knex, { Knex } from "knex";

export async function getKnexConnectionAsync(): Promise<Knex<any, unknown>> {
  const config = knexConfig[process.env["NODE_ENV"]?.toLowerCase()!];
  if (!config) {
    throw new Error("Invalid NODE_ENV, could not find knex configuration.");
  }
  await createDatabaseIfNotExistsAsync(config);

  // Create table if it doesn't exist
  const connection = knex(config);
  // Perform migrations on database structure
  await connection.migrate.latest();

  // Run relevant seeds.
  await seedDatabaseAsync(connection);

  return connection;
}

async function createDatabaseIfNotExistsAsync(config: Knex.Config): Promise<boolean> {
  // Remove database name from connection config
  const databaseName = (config.connection as any).database;
  delete (config.connection as any).database;

  let knexConnection = knex(config);

  // If the database doesn't exist, create it
  const databaseExists =
    (await knexConnection.from("information_schema.SCHEMATA").where("SCHEMA_NAME", databaseName))
      .length !== 0;
  let didCreateDatabase = false;
  if (!databaseExists) {
    await knexConnection.raw(
      `CREATE DATABASE \`${databaseName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`,
    );
    didCreateDatabase = true;
  }
  // Destroy the connection
  await knexConnection.destroy();
  // Restore database name
  (config.connection as any).database = databaseName;
  return didCreateDatabase;
}

async function seedDatabaseAsync(connection: Knex) {
  if (process.env["NODE_ENV"] == "test") {
    await connection.seed.run({ specific: `testSetup.ts` });
  }
}

export function setTableDefaults(table: Knex.CreateTableBuilder) {
  table.engine("InnoDB");
  table.charset("utf8mb4");
  table.collate("utf8mb4_general_ci");
}
