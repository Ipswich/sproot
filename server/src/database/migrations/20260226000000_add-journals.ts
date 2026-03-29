import { type Knex } from "knex";
import { setTableDefaults } from "../KnexUtilities";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("journals"))) {
    await knex.schema.createTable("journals", (table) => {
      table.increments("id").notNullable();
      table.string("title", 64).notNullable();
      table.text("description").defaultTo(null);
      table.boolean("archived").notNullable().defaultTo(false);
      table.string("icon", 64).defaultTo(null);
      table.string("color", 32).defaultTo(null);
      table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
      table.dateTime("editedAt").notNullable().defaultTo(knex.fn.now());
      table.dateTime("archivedAt").defaultTo(null);
      table.primary(["id"]);
      setTableDefaults(table);
    });
  }

  if (!(await knex.schema.hasTable("journal_tags"))) {
    await knex.schema.createTable("journal_tags", (table) => {
      table.increments("id").notNullable();
      table.string("name", 32).notNullable().unique();
      table.string("color", 32).defaultTo(null);
      table.primary(["id"]);
      setTableDefaults(table);
    });
  }

  if (!(await knex.schema.hasTable("journal_tag_lookup"))) {
    await knex.schema.createTable("journal_tag_lookup", (table) => {
      table.increments("id").notNullable();
      table
        .integer("journal_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("journals")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table
        .integer("tag_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("journal_tags")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.primary(["id"]);
      table.unique(["journal_id", "tag_id"]);
      table.index(["journal_id"]);
      table.index(["tag_id"]);
      setTableDefaults(table);
    });
  }

  if (!(await knex.schema.hasTable("journal_entries"))) {
    await knex.schema.createTable("journal_entries", (table) => {
      table.increments("id").notNullable();
      table
        .integer("journal_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("journals")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.string("title", 64).defaultTo(null);
      table.text("content").notNullable();
      table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
      table.dateTime("editedAt").notNullable().defaultTo(knex.fn.now());
      table.primary(["id"]);
      table.index(["journal_id", "createdAt"]);
      setTableDefaults(table);
    });
  }

  if (!(await knex.schema.hasTable("journal_entry_tags"))) {
    await knex.schema.createTable("journal_entry_tags", (table) => {
      table.increments("id").notNullable();
      table.string("name", 32).notNullable().unique();
      table.string("color", 32).defaultTo(null);
      table.primary(["id"]);
      setTableDefaults(table);
    });
  }

  if (!(await knex.schema.hasTable("journal_entry_tag_lookup"))) {
    await knex.schema.createTable("journal_entry_tag_lookup", (table) => {
      table.increments("id").notNullable();
      table
        .integer("journal_entry_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("journal_entries")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table
        .integer("tag_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("journal_entry_tags")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.primary(["id"]);
      table.unique(["journal_entry_id", "tag_id"]);
      table.index(["journal_entry_id"]);
      table.index(["tag_id"]);
      setTableDefaults(table);
    });
  }

  try {
    await knex.schema.table("output_data", (table) => {
      table.index(["output_id", "logTime"], "idx_output_logtime");
    });
  } catch (e) {
    // ignore
  }

  try {
    await knex.schema.table("sensor_data", (table) => {
      table.index(["sensor_id", "logTime"], "idx_sensor_logtime");
    });
  } catch (e) {
    // ignore
  }
}

export async function down(knex: Knex): Promise<void> {
  try {
    await knex.schema.table("output_data", (table) => {
      table.dropIndex(["output_id", "logTime"], "idx_output_logtime");
    });
  } catch (e) {
    // ignore
  }
  try {
    await knex.schema.table("sensor_data", (table) => {
      table.dropIndex(["sensor_id", "logTime"], "idx_sensor_logtime");
    });
  } catch (e) {
    // ignore
  }

  if (await knex.schema.hasTable("journal_entry_tag_lookup")) {
    await knex.schema.dropTable("journal_entry_tag_lookup");
  }
  if (await knex.schema.hasTable("journal_entry_tags")) {
    await knex.schema.dropTable("journal_entry_tags");
  }
  if (await knex.schema.hasTable("journal_entries")) {
    await knex.schema.dropTable("journal_entries");
  }
  if (await knex.schema.hasTable("journal_tag_lookup")) {
    await knex.schema.dropTable("journal_tag_lookup");
  }
  if (await knex.schema.hasTable("journal_tags")) {
    await knex.schema.dropTable("journal_tags");
  }
  if (await knex.schema.hasTable("journals")) {
    await knex.schema.dropTable("journals");
  }
}
