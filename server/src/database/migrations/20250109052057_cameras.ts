import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("cameras"))) {
    await knex.schema.createTable("cameras", (table) => {
      table.increments("id").notNullable();
      table.string("name", 64).notNullable();
      table.string("deviceIdentifier", 255).notNullable();
      table.string("resolution", 64).notNullable();
      table.integer("quality", 11).notNullable();
      table.tinyint("overlayTimestamp", 1).notNullable();
      table.tinyint("overlayName", 1).notNullable();
      table.string('overlayColor', 64).notNullable();
      table.integer("retentionDays", 11).notNullable();
      table.integer("frequencyMinutes", 11).notNullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("cameras");
}
