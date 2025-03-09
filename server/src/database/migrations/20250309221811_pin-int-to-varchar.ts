import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("outputs", (table) => {
    table.string("pin", 255).notNullable().alter();
  });
}

export async function down(_knex: Knex): Promise<void> {}
