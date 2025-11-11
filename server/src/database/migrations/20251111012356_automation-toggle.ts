import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("automations")) {
    await knex.schema.alterTable("automations", async (table) => {
      table.tinyint("enabled", 1).notNullable().defaultTo(1);
    });

    await knex.raw(
      "CREATE OR REPLACE VIEW output_actions_view AS " +
        knex("automations")
          .join("output_actions", "automations.id", "output_actions.automation_id")
          .select(
            "automations.id AS automationId",
            "output_actions.output_id AS outputId",
            "output_actions.id AS id",
            "automations.name AS name",
            "output_actions.value AS value",
            "automations.operator AS operator",
            "automations.enabled AS enabled",
          )
          .toQuery(),
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("automations", (table) => {
    table.dropColumn("enabled");
  });

  await knex.raw(
    "CREATE OR REPLACE VIEW output_actions_view AS " +
      knex("automations")
        .join("output_actions", "automations.id", "output_actions.automation_id")
        .select(
          "automations.id AS automationId",
          "output_actions.output_id AS outputId",
          "output_actions.id AS id",
          "automations.name AS name",
          "output_actions.value AS value",
          "automations.operator AS operator",
        )
        .toQuery(),
  );
}
