import type { Knex } from "knex";

const SETTINGS_TABLE = "settings";

export const config = {
  transaction: false,
};

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(SETTINGS_TABLE, (table) => {
    table.text("key").notNullable().primary();
    table.jsonb("value").notNullable();
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(SETTINGS_TABLE);
}
