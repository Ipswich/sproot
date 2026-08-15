import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("camera_settings", (table) => {
    table.string("captureUrl", 512).notNullable().defaultTo("");
    table.string("streamUrl", 512).notNullable().defaultTo("");
    table.string("healthUrl", 512).notNullable().defaultTo("");
  });

  await knex("camera_settings").update({
    captureUrl: knex.raw(`CASE WHEN "captureUrl" = '' THEN ? ELSE "captureUrl" END`, [
      "http://camera:3002/capture",
    ]),
    streamUrl: knex.raw(`CASE WHEN "streamUrl" = '' THEN ? ELSE "streamUrl" END`, [
      "http://camera:3002/stream.mjpg",
    ]),
    healthUrl: knex.raw(`CASE WHEN "healthUrl" = '' THEN ? ELSE "healthUrl" END`, [
      "http://camera:3002/health",
    ]),
  });

  await knex.schema.alterTable("camera_settings", (table) => {
    table.dropColumn("xVideoResolution");
    table.dropColumn("yVideoResolution");
    table.dropColumn("videoFps");
    table.dropColumn("xImageResolution");
    table.dropColumn("yImageResolution");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("camera_settings", (table) => {
    table.integer("xVideoResolution").nullable();
    table.integer("yVideoResolution").nullable();
    table.integer("videoFps").nullable();
    table.integer("xImageResolution").nullable();
    table.integer("yImageResolution").nullable();
  });

  await knex.schema.alterTable("camera_settings", (table) => {
    table.dropColumn("captureUrl");
    table.dropColumn("streamUrl");
    table.dropColumn("healthUrl");
  });
}