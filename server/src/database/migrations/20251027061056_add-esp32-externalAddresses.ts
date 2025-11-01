import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("external_devices"))) {
    await knex.schema.createTable("external_devices", (table) => {
      table.increments("id").notNullable();
      table.string("name").notNullable();
      table.string("type").notNullable();
      table.string("hostName").notNullable();
      table.string("secureToken").defaultTo(null);
      table.primary(["id"]);
    });

    await knex.schema.alterTable("sensors", (table) => {
      table
        .integer("externalDevice_id")
        .unsigned()
        .nullable()
        .defaultTo(null)
        .after("model")
        .references("id")
        .inTable("external_devices")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
    });

    await knex.schema.alterTable("outputs", (table) => {
      table
        .integer("externalDevice_id")
        .unsigned()
        .nullable()
        .defaultTo(null)
        .after("model")
        .references("id")
        .inTable("external_devices")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("sensors", (table) => {
    table.dropColumn("externalDevice_id");
  });
  await knex.schema.alterTable("outputs", (table) => {
    table.dropColumn("externalDevice_id");
  });

  await knex.schema.dropTableIfExists("external_devices");
}
