import type { Knex } from "knex";

const OUTPUT_GROUP_MODEL = "OUTPUT_GROUP";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("automations", (table) => {
    table.increments("id").notNullable();
    table.string("name", 32).notNullable();
    table.string("operator", 6).notNullable();
    table.boolean("enabled").notNullable().defaultTo(true);
    table.primary(["id"]);
  });

  await knex.schema.createTable("automation_tags", (table) => {
    table.string("tag", 32).notNullable();
    table.primary(["tag"]);
  });

  await knex.schema.createTable("device_zones", (table) => {
    table.increments("id").notNullable();
    table.string("name").notNullable();
    table.primary(["id"]);
  });

  await knex.schema.createTable("subcontrollers", (table) => {
    table.increments("id").notNullable();
    table.string("name").notNullable();
    table.string("type").notNullable();
    table.string("hostName").notNullable();
    table.string("secureToken").nullable();
    table.primary(["id"]);
  });

  await knex.schema.createTable("outputs", (table) => {
    table.increments("id").notNullable();
    table.string("model", 64).notNullable();
    table.integer("subcontroller_id").nullable();
    table.string("address", 64).notNullable();
    table.string("name", 64).nullable();
    table.string("color", 64).notNullable();
    table.string("pin", 255).notNullable();
    table.integer("deviceZoneId").nullable();
    table.integer("parentOutputId").nullable();
    table.boolean("isPwm").notNullable();
    table.boolean("isInvertedPwm").notNullable();
    table.integer("automationTimeout").notNullable();
    table.string("lastControlMode", 32).notNullable().defaultTo("automatic");
    table.integer("lastValue").notNullable().defaultTo(0);
    table.dateTime("lastStateUpdate").notNullable().defaultTo(knex.fn.now());
    table.primary(["id"]);
    table
      .foreign("subcontroller_id")
      .references("subcontrollers.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("deviceZoneId")
      .references("device_zones.id")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table.foreign("parentOutputId").references("outputs.id").onDelete("SET NULL");
    table.index(["subcontroller_id"]);
    table.index(["deviceZoneId"]);
  });

  await knex.schema.createTable("output_data", (table) => {
    table.increments("id").notNullable();
    table.integer("output_id").notNullable();
    table.integer("value").notNullable();
    table.string("controlMode", 32).notNullable();
    table.dateTime("logTime").notNullable().defaultTo(knex.fn.now());
    table.primary(["id"]);
    table.foreign("output_id").references("outputs.id").onDelete("CASCADE").onUpdate("CASCADE");
    table.index(["output_id"]);
    table.index(["output_id", "logTime"], "idx_output_logtime");
  });

  await knex.schema.createTable("sensors", (table) => {
    table.increments("id").notNullable();
    table.string("name", 64).nullable();
    table.string("model", 64).notNullable();
    table.integer("subcontroller_id").nullable();
    table.string("address", 64).notNullable();
    table.integer("deviceZoneId").nullable();
    table.string("color", 64).notNullable();
    table.string("pin", 255).nullable();
    table.decimal("lowCalibrationPoint", 12, 7).nullable();
    table.decimal("highCalibrationPoint", 12, 7).nullable();
    table.primary(["id"]);
    table
      .foreign("subcontroller_id")
      .references("subcontrollers.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("deviceZoneId")
      .references("device_zones.id")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
  });

  await knex.schema.createTable("sensor_data", (table) => {
    table.increments("id").notNullable();
    table.integer("sensor_id").notNullable();
    table.string("metric", 32).notNullable();
    table.decimal("data", 12, 7).notNullable();
    table.string("units", 16).notNullable();
    table.dateTime("logTime").notNullable().defaultTo(knex.fn.now());
    table.primary(["id"]);
    table.foreign("sensor_id").references("sensors.id").onDelete("CASCADE").onUpdate("CASCADE");
    table.index(["sensor_id"]);
    table.index(["sensor_id", "logTime"], "idx_sensor_logtime");
  });

  await knex.schema.createTable("output_actions", (table) => {
    table.increments("id").notNullable();
    table.integer("automation_id").notNullable();
    table.integer("output_id").notNullable();
    table.integer("value").notNullable();
    table.primary(["id"]);
    table
      .foreign("automation_id")
      .references("automations.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.foreign("output_id").references("outputs.id").onDelete("CASCADE").onUpdate("CASCADE");
    table.index(["automation_id"]);
    table.index(["output_id"]);
  });

  await knex.schema.createTable("notification_actions", (table) => {
    table.increments("id").notNullable();
    table.integer("automation_id").notNullable();
    table.string("subject", 128).notNullable();
    table.text("content").notNullable();
    table.primary(["id"]);
    table
      .foreign("automation_id")
      .references("automations.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.index(["automation_id"]);
  });

  await knex.schema.createTable("sensor_conditions", (table) => {
    table.increments("id").notNullable();
    table.integer("automation_id").notNullable();
    table.string("groupType", 6).notNullable();
    table.string("operator", 16).notNullable();
    table.decimal("comparisonValue", 12, 7).notNullable();
    table.integer("comparisonLookback").nullable();
    table.integer("sensor_id").notNullable();
    table.string("readingType", 16).notNullable();
    table.primary(["id"]);
    table
      .foreign("automation_id")
      .references("automations.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.foreign("sensor_id").references("sensors.id").onDelete("CASCADE").onUpdate("CASCADE");
    table.index(["automation_id"]);
    table.index(["sensor_id"]);
  });

  await knex.schema.createTable("output_conditions", (table) => {
    table.increments("id").notNullable();
    table.integer("automation_id").notNullable();
    table.string("groupType", 6).notNullable();
    table.string("operator", 16).notNullable();
    table.decimal("comparisonValue", 12, 7).notNullable();
    table.integer("comparisonLookback").nullable();
    table.integer("output_id").notNullable();
    table.primary(["id"]);
    table
      .foreign("automation_id")
      .references("automations.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.foreign("output_id").references("outputs.id").onDelete("CASCADE").onUpdate("CASCADE");
    table.index(["automation_id"]);
    table.index(["output_id"]);
  });

  await knex.schema.createTable("time_conditions", (table) => {
    table.increments("id").notNullable();
    table.integer("automation_id").notNullable();
    table.string("groupType", 6).notNullable();
    table.string("startTime", 8).nullable();
    table.string("endTime", 8).nullable();
    table.primary(["id"]);
    table
      .foreign("automation_id")
      .references("automations.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.index(["automation_id"]);
  });

  await knex.schema.createTable("weekday_conditions", (table) => {
    table.increments("id").notNullable();
    table.integer("automation_id").notNullable();
    table.string("groupType", 6).notNullable();
    table.integer("weekdays").notNullable();
    table.primary(["id"]);
    table
      .foreign("automation_id")
      .references("automations.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.index(["automation_id"]);
    table.check(
      '"weekdays" >= 0 AND "weekdays" <= 127',
      undefined,
      "weekday_conditions_range_check",
    );
  });

  await knex.schema.createTable("month_conditions", (table) => {
    table.increments("id").notNullable();
    table.integer("automation_id").notNullable();
    table.string("groupType", 6).notNullable();
    table.smallint("months").notNullable();
    table.primary(["id"]);
    table
      .foreign("automation_id")
      .references("automations.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.index(["automation_id"]);
    table.check('"months" >= 0 AND "months" <= 4095', undefined, "month_conditions_range_check");
  });

  await knex.schema.createTable("date_range_conditions", (table) => {
    table.increments("id").notNullable();
    table.integer("automation_id").notNullable();
    table.string("groupType", 6).notNullable();
    table.integer("startMonth").notNullable();
    table.integer("startDate").notNullable();
    table.integer("endMonth").notNullable();
    table.integer("endDate").notNullable();
    table.primary(["id"]);
    table
      .foreign("automation_id")
      .references("automations.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.index(["automation_id"]);
    table.check(
      '"startMonth" >= 1 AND "startMonth" <= 12',
      undefined,
      "date_range_conditions_start_month_check",
    );
    table.check(
      '"endMonth" >= 1 AND "endMonth" <= 12',
      undefined,
      "date_range_conditions_end_month_check",
    );
    table.check(
      '"startDate" >= 1 AND "startDate" <= 31',
      undefined,
      "date_range_conditions_start_date_check",
    );
    table.check(
      '"endDate" >= 1 AND "endDate" <= 31',
      undefined,
      "date_range_conditions_end_date_check",
    );
  });

  await knex.schema.createTable("automation_tag_lookup", (table) => {
    table.integer("automation_id").notNullable();
    table.string("tag", 32).notNullable();
    table.primary(["automation_id", "tag"]);
    table
      .foreign("automation_id")
      .references("automations.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.foreign("tag").references("automation_tags.tag").onDelete("CASCADE").onUpdate("CASCADE");
    table.index(["automation_id"]);
    table.index(["tag"]);
  });

  await knex.schema.createTable("users", (table) => {
    table.string("username", 32).notNullable();
    table.string("hash", 60).notNullable();
    table.string("email", 255).notNullable();
    table.primary(["username"]);
  });

  await knex.schema.createTable("camera_settings", (table) => {
    table.increments("id").notNullable();
    table.boolean("enabled").notNullable().defaultTo(false);
    table.string("name", 64).notNullable().unique();
    table.integer("xVideoResolution").nullable();
    table.integer("yVideoResolution").nullable();
    table.integer("videoFps").nullable();
    table.integer("xImageResolution").nullable();
    table.integer("yImageResolution").nullable();
    table.integer("imageRetentionDays").notNullable();
    table.integer("imageRetentionSize").notNullable();
    table.boolean("timelapseEnabled").notNullable().defaultTo(false);
    table.integer("timelapseInterval").nullable();
    table.string("timelapseStartTime", 8).nullable();
    table.string("timelapseEndTime", 8).nullable();
    table.primary(["id"]);
  });

  await knex.schema.createTable("journals", (table) => {
    table.increments("id").notNullable();
    table.string("title", 64).notNullable();
    table.text("description").nullable();
    table.boolean("archived").notNullable().defaultTo(false);
    table.string("icon", 64).nullable();
    table.string("color", 32).nullable();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("editedAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("archivedAt").nullable();
    table.primary(["id"]);
  });

  await knex.schema.createTable("journal_tags", (table) => {
    table.increments("id").notNullable();
    table.string("name", 32).notNullable().unique();
    table.string("color", 32).nullable();
    table.primary(["id"]);
  });

  await knex.schema.createTable("journal_tag_lookup", (table) => {
    table.increments("id").notNullable();
    table.integer("journal_id").notNullable();
    table.integer("tag_id").notNullable();
    table.primary(["id"]);
    table.foreign("journal_id").references("journals.id").onDelete("CASCADE").onUpdate("CASCADE");
    table.foreign("tag_id").references("journal_tags.id").onDelete("CASCADE").onUpdate("CASCADE");
    table.unique(["journal_id", "tag_id"]);
    table.index(["journal_id"]);
    table.index(["tag_id"]);
  });

  await knex.schema.createTable("journal_entries", (table) => {
    table.increments("id").notNullable();
    table.integer("journal_id").notNullable();
    table.string("title", 64).nullable();
    table.text("content").notNullable();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("editedAt").notNullable().defaultTo(knex.fn.now());
    table.primary(["id"]);
    table.foreign("journal_id").references("journals.id").onDelete("CASCADE").onUpdate("CASCADE");
    table.index(["journal_id", "createdAt"]);
  });

  await knex.schema.createTable("journal_entry_tags", (table) => {
    table.increments("id").notNullable();
    table.string("name", 32).notNullable().unique();
    table.string("color", 32).nullable();
    table.primary(["id"]);
  });

  await knex.schema.createTable("journal_entry_tag_lookup", (table) => {
    table.increments("id").notNullable();
    table.integer("journal_entry_id").notNullable();
    table.integer("tag_id").notNullable();
    table.primary(["id"]);
    table
      .foreign("journal_entry_id")
      .references("journal_entries.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .foreign("tag_id")
      .references("journal_entry_tags.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.unique(["journal_entry_id", "tag_id"]);
    table.index(["journal_entry_id"]);
    table.index(["tag_id"]);
  });

  await knex("camera_settings").insert({
    enabled: false,
    name: "Pi Camera",
    xVideoResolution: null,
    yVideoResolution: null,
    videoFps: null,
    xImageResolution: null,
    yImageResolution: null,
    imageRetentionDays: 90,
    imageRetentionSize: 5000,
    timelapseEnabled: false,
    timelapseInterval: 5,
    timelapseStartTime: null,
    timelapseEndTime: null,
  });

  await knex.raw(`
    CREATE OR REPLACE VIEW output_actions_view AS
    SELECT
      automations.id AS "automationId",
      output_actions.output_id AS "outputId",
      output_actions.id AS id,
      automations.name AS name,
      output_actions.value AS value,
      automations.operator AS operator,
      automations.enabled AS enabled
    FROM automations
    JOIN output_actions ON automations.id = output_actions.automation_id;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION validate_output_parent()
    RETURNS TRIGGER AS $$
    DECLARE
      parent_model TEXT;
    BEGIN
      IF NEW."parentOutputId" IS NULL THEN
        RETURN NEW;
      END IF;

      IF NEW.id IS NOT NULL AND NEW."parentOutputId" = NEW.id THEN
        RAISE EXCEPTION 'parentOutputId cannot reference itself';
      END IF;

      SELECT model INTO parent_model FROM outputs WHERE id = NEW."parentOutputId";
      IF parent_model IS NOT NULL AND parent_model <> '${OUTPUT_GROUP_MODEL}' THEN
        RAISE EXCEPTION 'parentOutputId must reference an output group';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER outputs_parent_validation
    BEFORE INSERT OR UPDATE ON outputs
    FOR EACH ROW
    EXECUTE FUNCTION validate_output_parent();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP VIEW IF EXISTS output_actions_view;");
  await knex.raw("DROP TRIGGER IF EXISTS outputs_parent_validation ON outputs;");
  await knex.raw("DROP FUNCTION IF EXISTS validate_output_parent();");

  await knex.schema.dropTableIfExists("journal_entry_tag_lookup");
  await knex.schema.dropTableIfExists("journal_entry_tags");
  await knex.schema.dropTableIfExists("journal_entries");
  await knex.schema.dropTableIfExists("journal_tag_lookup");
  await knex.schema.dropTableIfExists("journal_tags");
  await knex.schema.dropTableIfExists("journals");
  await knex.schema.dropTableIfExists("camera_settings");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("automation_tag_lookup");
  await knex.schema.dropTableIfExists("date_range_conditions");
  await knex.schema.dropTableIfExists("month_conditions");
  await knex.schema.dropTableIfExists("weekday_conditions");
  await knex.schema.dropTableIfExists("time_conditions");
  await knex.schema.dropTableIfExists("output_conditions");
  await knex.schema.dropTableIfExists("sensor_conditions");
  await knex.schema.dropTableIfExists("notification_actions");
  await knex.schema.dropTableIfExists("output_actions");
  await knex.schema.dropTableIfExists("sensor_data");
  await knex.schema.dropTableIfExists("sensors");
  await knex.schema.dropTableIfExists("output_data");
  await knex.schema.dropTableIfExists("outputs");
  await knex.schema.dropTableIfExists("subcontrollers");
  await knex.schema.dropTableIfExists("device_zones");
  await knex.schema.dropTableIfExists("automation_tags");
  await knex.schema.dropTableIfExists("automations");
}
