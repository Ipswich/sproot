import type { Knex } from "knex";
import { setTableDefaults } from "../KnexUtilities";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists("device_groups", (table) => {
    setTableDefaults(table);
    table.increments("id").primary();
    table.string("name").notNullable();
  });

  await knex.schema.alterTable("outputs", (table) => {
    table
      .integer("deviceGroupId")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("device_groups")
      .onDelete("SET NULL")
      .after("pin");
  });

  await knex.schema.alterTable("sensors", (table) => {
    table
      .integer("deviceGroupId")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("device_groups")
      .onDelete("SET NULL")
      .after("address");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("device_groups");
  await knex.schema.alterTable("outputs", (table) => {
    table.dropColumn("deviceGroupId");
  });
  await knex.schema.alterTable("sensors", (table) => {
    table.dropColumn("deviceGroupId");
  });
}
