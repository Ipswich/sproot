import { type Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable("automations")) {
    await knex.schema.createTable("automations", (table) => {
      table.increments("id").notNullable();
      table.string("name", 32).notNullable();
      table.string("operator", 6).notNullable();
      table.primary(["id"]);
      setTableDefaults(table);
    });
  }

  if (!await knex.schema.hasTable("automation_tags")) {
    await knex.schema.createTable("automation_tags", (table) => {
      table.string("tag", 32).notNullable();
      table.primary(["tag"]);
      setTableDefaults(table);
    });
  }

  if (!await knex.schema.hasTable("automation_tag_lookup")) {
    await knex.schema.createTable("automation_tag_lookup", (table) => {
      table
        .integer("automation_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("automations")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table
        .string("tag", 32)
        .notNullable()
        .references("tag")
        .inTable("automation_tags")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.primary(["automation_id", "tag"]);
      table.index(["automation_id"]);
      table.index(["tag"]);
      setTableDefaults(table);
    });
  }
  if (!await knex.schema.hasTable("outputs")) {
    await knex.schema.createTable("outputs", (table) => {
      table.increments("id").notNullable();
      table.string("model", 64).notNullable();
      table.string("address", 64).notNullable();
      table.string("name", 64).defaultTo(null);
      table.string("color", 64).notNullable();
      table.integer("pin", 11).notNullable();
      table.tinyint("isPwm", 1).notNullable();
      table.tinyint("isInvertedPwm", 1).notNullable();
      table.integer("automationTimeout", 11).notNullable();
      table.primary(["id"]);
      setTableDefaults(table);
    });
  }

  if (!await knex.schema.hasTable("output_actions")) {
    await knex.schema.createTable("output_actions", (table) => {
      table.increments("id").notNullable();
      table
        .integer("automation_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("automations")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table
        .integer("output_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("outputs")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.integer("value", 11).notNullable();
      table.primary(["id"]);
      table.index(["automation_id"]);
      table.index(["output_id"]);
      setTableDefaults(table);
    });
  }
  if (!await knex.schema.hasTable("output_conditions")) {
    await knex.schema.createTable("output_conditions", (table) => {
      table.increments("id").notNullable();
      table
        .integer("automation_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("automations")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.string("groupType", 6).notNullable();
      table.string("operator", 16).notNullable();
      table.decimal("comparisonValue", 12, 7).notNullable();
      table
        .integer("output_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("outputs")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.primary(["id"]);
      table.index(["automation_id"]);
      table.index(["output_id"]);
      setTableDefaults(table);
    });
  }

  if (!await knex.schema.hasTable("output_data")) {
    await knex.schema.createTable("output_data", (table) => {
      table.increments("id").notNullable();
      table
        .integer("output_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("outputs")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.integer("value", 11).notNullable();
      table.string("controlMode", 32).notNullable();
      table.dateTime("logTime").notNullable().defaultTo(knex.fn.now());
      table.primary(["id"]);
      table.index(["output_id"]);
      setTableDefaults(table);
    });
  }

  if (!await knex.schema.hasTable("sensors")) {
    await knex.schema.createTable("sensors", (table) => {
      table.increments("id").notNullable();
      table.string("name", 64).defaultTo(null);
      table.string("model", 64).notNullable();
      table.string("address", 64).notNullable();
      table.string("color", 64).notNullable();
      table.primary(["id"]);
      setTableDefaults(table);
    });
  }

  if (!await knex.schema.hasTable("sensor_conditions")) {
    await knex.schema.createTable("sensor_conditions", (table) => {
      table.increments("id").notNullable();
      table
        .integer("automation_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("automations")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.string("groupType", 6).notNullable();
      table.string("operator", 16).notNullable();
      table.decimal("comparisonValue", 12, 7).notNullable();
      table
        .integer("sensor_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("sensors")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.string("readingType", 16).notNullable();
      table.primary(["id"]);
      table.index(["sensor_id"]);
      table.index(["automation_id"]);
      setTableDefaults(table);
    });
  }
  if (!await knex.schema.hasTable("sensor_data")) {
    await knex.schema.createTable("sensor_data", (table) => {
      table.increments("id").notNullable();
      table
        .integer("sensor_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("sensors")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.string("metric", 32).notNullable();
      table.decimal("data", 12, 7).notNullable();
      table.string("units", 16).notNullable();
      table.dateTime("logTime").notNullable().defaultTo(knex.fn.now());
      table.primary(["id"]);
      table.index(["sensor_id"]);
      setTableDefaults(table);
    });
  }

  if (!await knex.schema.hasTable("time_conditions")) {
    await knex.schema.createTable("time_conditions", (table) => {
      table.increments("id").notNullable();
      table
        .integer("automation_id", 10)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("automations")
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
      table.string("groupType", 6).notNullable();
      table.string("startTime", 8).notNullable();
      table.string("endTime", 8).notNullable();
      table.primary(["id"]);
      table.index(["automation_id"]);
      setTableDefaults(table);
    });
  }

  if (!await knex.schema.hasTable("users")) {
    await knex.schema.createTable("users", (table) => {
      table.string("username", 32).notNullable();
      table.string("hash", 60).notNullable();
      table.string("email", 255).notNullable();
      table.primary(["username"]);
      setTableDefaults(table);
    });
  }

  const viewExists = await knex.raw(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.views
       WHERE table_name = ?
     ) AS view_exists;`,
    ["output_actions_view"]
  );

  if (!viewExists.rows[0].view_exists) {
    await knex.schema.createView("output_actions_view", (view) => {
      view.as(
        knex("automations")
          .join("output_actions", "automations.id", "output_actions.automation_id")
          .select(
            "automations.id AS automationId",
            "output_actions.output_id AS outputId",
            "output_actions.id AS id",
            "automations.name AS name",
            "output_actions.value AS value",
            "automations.operator AS operator",
          ),
      );
    });
  }
}

export async function down(_knex: Knex): Promise<void> { }

function setTableDefaults(table: Knex.CreateTableBuilder) {
  table.engine("InnoDB");
  table.charset("utf8mb4");
  table.collate("utf8mb4_general_ci");
}
