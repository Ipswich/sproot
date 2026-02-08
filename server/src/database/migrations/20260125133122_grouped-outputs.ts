import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table("outputs", async (table) => {
    table
      .integer("parentOutputId")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("outputs")
      .onDelete("SET NULL");
    // Parents cannot be themselves
    await knex.raw(`
    CREATE TRIGGER outputs_no_self_parent_update
    BEFORE UPDATE ON outputs
    FOR EACH ROW
    BEGIN
      IF NEW.parentOutputId IS NOT NULL
         AND NEW.parentOutputId = OLD.id THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'parentOutputId cannot reference itself';
      END IF;
    END;
  `);

    // Parents must be output group only
    table.check(
      "parentOutputId IS NULL OR EXISTS (SELECT 1 FROM outputs AS parent WHERE parent.id = parentOutputId AND parent.model = 'OUTPUT_GROUP')",
      undefined,
      "outputs_parent_is_output_group_only",
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn("outputs", "parentOutputId")) {
    await knex.raw(`DROP TRIGGER IF EXISTS outputs_no_self_parent_update;`);
    await knex.schema.table("outputs", (table) => {
      table.dropChecks(["outputs_parent_is_output_group_only"]);
      table.dropColumn("parentOutputId");
    });
  }
}
