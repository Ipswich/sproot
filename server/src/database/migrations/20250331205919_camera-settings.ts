import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("camera_settings"))) {
    await knex.schema.createTable("camera_settings", (table) => {
      table.increments("id").notNullable();
      table.tinyint("enabled", 1).notNullable().defaultTo(0);
      table.string("name", 64).unique().notNullable();
      table.integer("xVideoResolution").nullable().checkPositive();
      table.integer("yVideoResolution").nullable().checkPositive();
      table.integer("videoFps").nullable().checkPositive();
      table.integer("xImageResolution").nullable().checkPositive();
      table.integer("yImageResolution").nullable().checkPositive();
      table.integer("imageRetentionDays").notNullable().checkPositive();
      table.integer("imageRetentionSize").notNullable().checkPositive();
      table.tinyint("timelapseEnabled", 1).notNullable().defaultTo(0);
      table.integer("timelapseInterval").nullable().checkPositive();
      table.string("timelapseStartTime", 8).nullable();
      table.string("timelapseEndTime", 8).nullable();
    });

    await knex.table("camera_settings").insert({
      enabled: false,
      name: "Pi Camera",
      xVideoResolution: null,
      yVideoResolution: null,
      videoFps: null,
      xImageResolution: null,
      yImageResolution: null,
      imageRetentionDays: 90,
      imageRetentionSize: 5000,
      timelapseEnabled: false,
      timelapseInterval: 5,
      timelapseStartTime: null,
      timelapseEndTime: null,
    });
  }
}

export async function down(_knex: Knex): Promise<void> {}
