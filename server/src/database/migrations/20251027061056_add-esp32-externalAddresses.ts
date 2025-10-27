import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("sensors", (table) => {
    table.string("externalAddress", 255).nullable().defaultTo(null).after("model");
  });
  await knex.schema.alterTable("outputs", (table) => {
    table.string("externalAddress", 255).nullable().defaultTo(null).after("model");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("sensors", (table) => {
    table.dropColumn("externalAddress");
  });
  await knex.schema.alterTable("outputs", (table) => {
    table.dropColumn("externalAddress");
  });
}
