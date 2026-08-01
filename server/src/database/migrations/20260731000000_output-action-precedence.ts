import type { Knex } from "knex";

const OUTPUT_ACTION_PRECEDENCE_CONSTRAINT = "output_actions_precedence_check";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("output_actions", (table) => {
    table.string("precedence", 32).notNullable().defaultTo("Normal");
  });

  await knex.raw(`
    ALTER TABLE output_actions
    ADD CONSTRAINT ${OUTPUT_ACTION_PRECEDENCE_CONSTRAINT}
    CHECK (precedence IN ('Normal', 'High', 'Emergency'));
  `);

  await knex.raw("DROP VIEW IF EXISTS output_actions_view;");

  await knex.raw(`
    CREATE VIEW output_actions_view AS
    SELECT
      automations.id AS "automationId",
      output_actions.output_id AS "outputId",
      output_actions.id AS id,
      automations.name AS name,
      output_actions.value AS value,
      output_actions.precedence AS precedence,
      automations.operator AS operator,
      automations.enabled AS enabled
    FROM automations
    JOIN output_actions ON automations.id = output_actions.automation_id;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP VIEW IF EXISTS output_actions_view;");
  await knex.raw(`ALTER TABLE output_actions DROP CONSTRAINT IF EXISTS ${OUTPUT_ACTION_PRECEDENCE_CONSTRAINT};`);

  await knex.schema.alterTable("output_actions", (table) => {
    table.dropColumn("precedence");
  });

  await knex.raw(`
    CREATE VIEW output_actions_view AS
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
}