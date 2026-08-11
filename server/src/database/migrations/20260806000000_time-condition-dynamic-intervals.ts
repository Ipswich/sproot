import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("time_conditions", (table) => {
    table.string("startTime", 32).nullable().alter();
    table.string("endTime", 32).nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("time_conditions", (table) => {
    table.string("startTime", 8).nullable().alter();
    table.string("endTime", 8).nullable().alter();
  });
}
