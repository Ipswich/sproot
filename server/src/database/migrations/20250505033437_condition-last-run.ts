import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("automations", (table) => {
    table.dateTime("lastRunTime").nullable().defaultTo(null);
  });
  await knex.schema.createViewOrReplace("output_actions_view", (view) => {
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
          "automations.lastRunTime AS lastRunTime",
        ),
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("automations", (table) => {
    table.dropColumn("lastRunTime");
  });
  await knex.schema.createViewOrReplace("output_actions_view", (view) => {
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
