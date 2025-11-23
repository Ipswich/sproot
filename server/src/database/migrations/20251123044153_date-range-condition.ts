import type { Knex } from "knex";
import { setTableDefaults } from "../KnexUtilities";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("date_range_conditions"))) {
    await knex.schema.createTable("date_range_conditions", (table) => {
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
      table.tinyint("startMonth").unsigned().notNullable().checkBetween([1, 12]);
      table.tinyint("startDay").unsigned().notNullable().checkBetween([1, 31]);
      table.tinyint("endMonth").unsigned().notNullable().checkBetween([1, 12]);
      table.tinyint("endDay").unsigned().notNullable().checkBetween([1, 31]);
      table.primary(["id"]);
      setTableDefaults(table);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("date_range_conditions");
}
