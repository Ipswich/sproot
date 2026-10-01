// import { Knex } from "knex";

// export async function up(knex: Knex): Promise<void> {
//   const hasTokenVersionColumn = await knex.schema.hasColumn("users", "tokenVersion");
//   if (hasTokenVersionColumn) {
//     return;
//   }

//   await knex.schema.alterTable("users", (table) => {
//     table.integer("tokenVersion").notNullable().defaultTo(0);
//   });
// }

// export async function down(knex: Knex): Promise<void> {
//   const hasTokenVersionColumn = await knex.schema.hasColumn("users", "tokenVersion");
//   if (!hasTokenVersionColumn) {
//     return;
//   }

//   await knex.schema.alterTable("users", (table) => {
//     table.dropColumn("tokenVersion");
//   });
// }