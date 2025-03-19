import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("outputs", (table) => {
    table.string("lastControlMode", 32).notNullable().defaultTo("automatic");
    table.integer("lastValue", 11).notNullable().defaultTo(0);
    table.dateTime("lastStateUpdate").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("outputs", (table) => {
    table.dropColumn("lastControlMode");
    table.dropColumn("lastValue");
    table.dropColumn("lastStateUpdate");
  });
}
