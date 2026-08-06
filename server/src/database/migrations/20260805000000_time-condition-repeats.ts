import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("time_conditions", (table) => {
    table.integer("repeatInterval").nullable();
    table.integer("repeatDuration").nullable();
    table.string("phaseAnchorType", 16).nullable();
    table.string("phaseAnchorValue", 64).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("time_conditions", (table) => {
    table.dropColumn("phaseAnchorValue");
    table.dropColumn("phaseAnchorType");
    table.dropColumn("repeatDuration");
    table.dropColumn("repeatInterval");
  });
}
