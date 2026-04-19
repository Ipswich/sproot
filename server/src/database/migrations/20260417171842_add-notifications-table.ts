import { type Knex } from "knex";
import { setTableDefaults } from "../KnexUtilities";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("notification_actions"))) {
    await knex.schema.createTable("notification_actions", (table) => {
      table.increments("id").primary();
      table
        .integer("automation_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("automations")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.string("subject", 64).notNullable();
      table.text("content").notNullable();
      table.primary(["id"]);
      table.index(["automation_id"]);
      setTableDefaults(table);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("notification_actions")) {
    await knex.schema.dropTable("notification_actions");
  }
}
