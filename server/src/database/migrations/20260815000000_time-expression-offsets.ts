import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("time_conditions", (table) => {
    table.integer("startOffsetSeconds").nullable();
    table.integer("endOffsetSeconds").nullable();
  });

  await knex.schema.alterTable("camera_settings", (table) => {
    table.string("timelapseStartTime", 32).nullable().alter();
    table.integer("timelapseStartOffsetSeconds").nullable();
    table.string("timelapseEndTime", 32).nullable().alter();
    table.integer("timelapseEndOffsetSeconds").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("camera_settings", (table) => {
    table.dropColumn("timelapseEndOffsetSeconds");
    table.string("timelapseEndTime", 8).nullable().alter();
    table.dropColumn("timelapseStartOffsetSeconds");
    table.string("timelapseStartTime", 8).nullable().alter();
  });

  await knex.schema.alterTable("time_conditions", (table) => {
    table.dropColumn("endOffsetSeconds");
    table.dropColumn("startOffsetSeconds");
  });
}
