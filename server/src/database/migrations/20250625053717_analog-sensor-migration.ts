import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("sensors", (table) => {
    table.string("pin", 255).nullable().defaultTo(null);
    table.decimal("lowCalibrationPoint", 12, 7).nullable().defaultTo(null);
    table.decimal("highCalibrationPoint", 12, 7).nullable().defaultTo(null);
  });
}


export async function down(_knex: Knex): Promise<void> {

}
