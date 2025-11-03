import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("subcontrollers"))) {
    await knex.schema.createTable("subcontrollers", (table) => {
      table.increments("id").notNullable();
      table.string("name").notNullable();
      table.string("type").notNullable();
      table.string("hostName").notNullable();
      table.string("secureToken").defaultTo(null);
      table.primary(["id"]);
    });

    await knex.schema.alterTable("sensors", (table) => {
      table
        .integer("subcontroller_id")
        .unsigned()
        .nullable()
        .defaultTo(null)
        .after("model")
        .references("id")
        .inTable("subcontrollers")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
    });

    await knex.schema.alterTable("outputs", (table) => {
      table
        .integer("subcontroller_id")
        .unsigned()
        .nullable()
        .defaultTo(null)
        .after("model")
        .references("id")
        .inTable("subcontrollers")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("sensors", (table) => {
    table.dropColumn("subcontroller_id");
  });
  await knex.schema.alterTable("outputs", (table) => {
    table.dropColumn("subcontroller_id");
  });

  await knex.schema.dropTableIfExists("subcontrollers");
}
