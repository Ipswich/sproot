import type { Knex } from "knex";
import { setTableDefaults } from "../KnexUtilities";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("month_conditions"))) {
    await knex.schema.createTable("month_conditions", (table) => {
      table.increments("id").notNullable();
      table
        .integer("automation_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("automations")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.string("groupType", 6).notNullable();
      table.tinyint("months").unsigned().notNullable().checkBetween([0, 127]);
      table.primary(["id"]);
      setTableDefaults(table);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("month_conditions");
}
