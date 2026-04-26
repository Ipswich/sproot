import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Rename table if it exists
  if (await knex.schema.hasTable("device_groups")) {
    await knex.schema.renameTable("device_groups", "device_zones");
  }

  // Outputs: migrate deviceZoneId -> deviceZoneId
  if (await knex.schema.hasColumn("outputs", "deviceGroupId")) {
    await knex.schema.alterTable("outputs", (table) => {
      table.renameColumn("deviceGroupId", "deviceZoneId");
    });
  }

  // Sensors: migrate deviceZoneId -> deviceZoneId
  if (await knex.schema.hasColumn("sensors", "deviceGroupId")) {
    await knex.schema.alterTable("sensors", (table) => {
      table.renameColumn("deviceGroupId", "deviceZoneId");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Outputs: revert deviceZoneId -> deviceGroupId
  if (await knex.schema.hasColumn("outputs", "deviceZoneId")) {
    await knex.schema.alterTable("outputs", (table) => {
      table.renameColumn("deviceZoneId", "deviceGroupId");
    });
  }

  // Sensors: revert deviceZoneId -> deviceGroupId
  if (await knex.schema.hasColumn("sensors", "deviceZoneId")) {
    await knex.schema.alterTable("sensors", (table) => {
      table.renameColumn("deviceZoneId", "deviceGroupId");
    });
  }

  if (await knex.schema.hasTable("device_zones")) {
    await knex.schema.renameTable("device_zones", "device_groups");
  }
}
