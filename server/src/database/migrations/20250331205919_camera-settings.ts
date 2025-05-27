import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("camera_settings"))) {
    await knex.schema.createTable("camera_settings", (table) => {
      table.increments("id").notNullable();
      table.string("name").unique().notNullable();
      table.integer("xVideoResolution").nullable();
      table.integer("yVideoResolution").nullable();
      table.integer("videoFps").nullable();
      table.integer("xImageResolution").nullable();
      table.integer("yImageResolution").nullable();
      table.integer("imageRetentionDays").notNullable();
      table.integer("imageRetentionSize").notNullable();
      table.tinyint("timelapseEnabled", 1).notNullable().defaultTo(0);
      table.integer("timelapseInterval").nullable();
    });
  }
}

export async function down(_knex: Knex): Promise<void> {}
