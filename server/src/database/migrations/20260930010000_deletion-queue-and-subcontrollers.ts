import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("outputs", (table) => {
    table.boolean("pendingDeletion").notNullable().defaultTo(false);
    table.dateTime("pendingDeletionStartedAt").nullable();
    table.index(["pendingDeletion"], "outputs_pending_deletion_idx");
  });

  await knex.schema.alterTable("sensors", (table) => {
    table.boolean("pendingDeletion").notNullable().defaultTo(false);
    table.dateTime("pendingDeletionStartedAt").nullable();
    table.index(["pendingDeletion"], "sensors_pending_deletion_idx");
  });

  await knex.schema.alterTable("subcontrollers", (table) => {
    table.boolean("pendingDeletion").notNullable().defaultTo(false);
    table.dateTime("pendingDeletionStartedAt").nullable();
    table.index(["pendingDeletion"], "subcontrollers_pending_deletion_idx");
  });

  await knex.schema.createTable("deletion_queue", (table) => {
    table.increments("id").notNullable();
    table.string("entityType", 32).notNullable();
    table.integer("entityId").notNullable();
    table.string("status", 16).notNullable().defaultTo("pending");
    table.integer("attemptCount").notNullable().defaultTo(0);
    table.text("lastError").nullable();
    table.string("lockedBy", 128).nullable();
    table.dateTime("requestedAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("availableAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("lockedAt").nullable();
    table.dateTime("lockExpiresAt").nullable();
    table.dateTime("finishedAt").nullable();
    table.primary(["id"]);
    table.index(["status", "availableAt"], "deletion_queue_status_available_idx");
    table.index(["status", "lockExpiresAt"], "deletion_queue_status_lease_idx");
  });

  await knex.raw(`
    CREATE UNIQUE INDEX deletion_queue_active_entity_idx
    ON deletion_queue ("entityType", "entityId")
    WHERE status IN ('pending', 'processing');
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS deletion_queue_active_entity_idx;`);
  await knex.schema.dropTableIfExists("deletion_queue");

  await knex.schema.alterTable("outputs", (table) => {
    table.dropIndex(["pendingDeletion"], "outputs_pending_deletion_idx");
    table.dropColumn("pendingDeletionStartedAt");
    table.dropColumn("pendingDeletion");
  });

  await knex.schema.alterTable("sensors", (table) => {
    table.dropIndex(["pendingDeletion"], "sensors_pending_deletion_idx");
    table.dropColumn("pendingDeletionStartedAt");
    table.dropColumn("pendingDeletion");
  });

  await knex.schema.alterTable("subcontrollers", (table) => {
    table.dropIndex(["pendingDeletion"], "subcontrollers_pending_deletion_idx");
    table.dropColumn("pendingDeletionStartedAt");
    table.dropColumn("pendingDeletion");
  });
}