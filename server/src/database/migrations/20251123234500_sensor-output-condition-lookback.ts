import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await Promise.allSettled([
    knex.schema.alterTable("sensor_conditions", (table) => {
      table.integer("comparisonLookback").after("comparisonValue").nullable().defaultTo(null);
    }),
    knex.schema.alterTable("output_conditions", (table) => {
      table.integer("comparisonLookback").after("comparisonValue").nullable().defaultTo(null);
    })
  ]);
}


export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable("sensor_conditions", (table) => {
      table.dropColumn("comparisonLookback");
    }),
    knex.schema.alterTable("output_conditions", (table) => {
      table.dropColumn("comparisonLookback");
    })
  ]);
}