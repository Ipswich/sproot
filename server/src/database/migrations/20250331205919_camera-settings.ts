import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("camera_settings"))) {
    await knex.schema.createTable("camera_settings", (table) => {
      table.increments("id").notNullable();
      table.integer("xVideoResolution").notNullable();
      table.integer("yVideoResolution").notNullable();
      table.integer("xImageResolution").notNullable();
      table.integer("yImageResolution").notNullable();
    });
  }
}

export async function down(_knex: Knex): Promise<void> {}
