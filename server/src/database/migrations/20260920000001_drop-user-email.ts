import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasEmailColumn = await knex.schema.hasColumn("users", "email");
  if (!hasEmailColumn) {
    return;
  }

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("email");
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasEmailColumn = await knex.schema.hasColumn("users", "email");
  if (hasEmailColumn) {
    return;
  }

  await knex.schema.alterTable("users", (table) => {
    table.string("email", 255).notNullable().defaultTo("");
  });
}