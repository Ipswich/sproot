import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  console.log("Truncating tables...");

  let tables = await knex
    .select("table_name")
    .from("information_schema.tables")
    .where("table_schema", "sproot-test");

  tables = tables
    .map((table) => table.table_name as string)
    // Filter out knex migration tables and views
    .filter((table) => !table.includes("knex") && !table.includes("view"));

  await knex.raw("SET FOREIGN_KEY_CHECKS = 0;");
  for (const table of tables) {
    await knex(table).truncate();
  }
  await knex.raw("SET FOREIGN_KEY_CHECKS = 1;");

  console.log("Seeding test database...");
  //SEED SHIT HERE
}
