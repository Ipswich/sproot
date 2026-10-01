import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";
import {
  DeletionEntityType,
  DeletionQueueJob,
  IDeletionQueueRepository,
} from "./IDeletionQueueRepository";

type Executor = Knex | Knex.Transaction;

type DeletionQueueRow = {
  id: number;
  entityType: DeletionEntityType;
  entityId: number;
  status: "pending" | "processing" | "completed";
  attemptCount: number | string;
  lastError: string | null;
  lockedBy: string | null;
  requestedAt: Date;
  availableAt: Date;
  lockedAt: Date | null;
  lockExpiresAt: Date | null;
  finishedAt: Date | null;
};

export class DeletionQueueRepository
  extends BaseKnexRepository
  implements IDeletionQueueRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async enqueueAsync(
    executor: Executor,
    entityType: DeletionEntityType,
    entityId: number,
  ): Promise<void> {
    await executor.raw(
      `
        INSERT INTO deletion_queue ("entityType", "entityId", status, "requestedAt", "availableAt")
        VALUES (?, ?, 'pending', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `,
      [entityType, entityId],
    );
  }

  async enqueueManyAsync(
    executor: Executor,
    jobs: Array<{ entityType: DeletionEntityType; entityId: number }>,
  ): Promise<void> {
    for (const job of jobs) {
      await this.enqueueAsync(executor, job.entityType, job.entityId);
    }
  }

  async claimNextAsync(workerId: string, leaseMs: number): Promise<DeletionQueueJob | null> {
    const result = await this.connection.transaction(async (trx) => {
      return trx.raw(
        `
          WITH next_job AS (
            SELECT id
            FROM deletion_queue
            WHERE (
              status = 'pending'
              AND "availableAt" <= NOW()
            ) OR (
              status = 'processing'
              AND "lockExpiresAt" IS NOT NULL
              AND "lockExpiresAt" <= NOW()
            )
            ORDER BY "requestedAt" ASC, id ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE deletion_queue queue
          SET
            status = 'processing',
            "attemptCount" = queue."attemptCount" + 1,
            "lockedBy" = ?,
            "lockedAt" = NOW(),
            "lockExpiresAt" = NOW() + (? || ' milliseconds')::interval,
            "lastError" = NULL
          FROM next_job
          WHERE queue.id = next_job.id
          RETURNING queue.*
        `,
        [workerId, leaseMs],
      );
    });

    const row = this.getRawRows<DeletionQueueRow>(result)[0];
    return row ? this.#mapRow(row) : null;
  }

  async renewLeaseAsync(jobId: number, workerId: string, leaseMs: number): Promise<boolean> {
    const updatedRows = await this.connection("deletion_queue")
      .where("id", jobId)
      .andWhere("status", "processing")
      .andWhere("lockedBy", workerId)
      .update({
        lockedAt: this.getCurrentTimestampValue(),
        lockExpiresAt: this.connection.raw(`NOW() + (? || ' milliseconds')::interval`, [leaseMs]),
      });

    return updatedRows > 0;
  }

  async requeueAsync(
    jobId: number,
    workerId: string,
    delayMs: number,
    lastError?: string,
  ): Promise<void> {
    await this.connection("deletion_queue")
      .where("id", jobId)
      .andWhere("lockedBy", workerId)
      .update({
        status: "pending",
        lastError: lastError ?? null,
        availableAt: this.connection.raw(`NOW() + (? || ' milliseconds')::interval`, [delayMs]),
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
      });
  }

  async completeAsync(jobId: number, workerId: string): Promise<void> {
    await this.connection("deletion_queue")
      .where("id", jobId)
      .andWhere("lockedBy", workerId)
      .update({
        status: "completed",
        finishedAt: this.getCurrentTimestampValue(),
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
      });
  }

  #mapRow(row: DeletionQueueRow): DeletionQueueJob {
    return {
      ...row,
      attemptCount:
        typeof row.attemptCount === "string" ? parseInt(row.attemptCount, 10) : row.attemptCount,
    };
  }
}