import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("camera_settings", (table) => {
    table.integer("latestImageRefreshIntervalSeconds").notNullable().defaultTo(60);
  });

  await knex("camera_settings").update({
    latestImageRefreshIntervalSeconds: 60,
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("camera_settings", (table) => {
    table.dropColumn("latestImageRefreshIntervalSeconds");
  });
}
