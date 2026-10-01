import { Knex } from "knex";

export type DeletionEntityType = "output" | "sensor" | "subcontroller";
export type DeletionJobStatus = "pending" | "processing" | "completed";
export type DeletionRequestResult = "queued" | "already-pending" | "not-found";

export interface DeletionQueueJob {
  id: number;
  entityType: DeletionEntityType;
  entityId: number;
  status: DeletionJobStatus;
  attemptCount: number;
  lastError: string | null;
  lockedBy: string | null;
  requestedAt: Date;
  availableAt: Date;
  lockedAt: Date | null;
  lockExpiresAt: Date | null;
  finishedAt: Date | null;
}

export interface IDeletionQueueRepository {
  enqueueAsync(
    executor: Knex | Knex.Transaction,
    entityType: DeletionEntityType,
    entityId: number,
  ): Promise<void>;
  enqueueManyAsync(
    executor: Knex | Knex.Transaction,
    jobs: Array<{ entityType: DeletionEntityType; entityId: number }>,
  ): Promise<void>;
  claimNextAsync(workerId: string, leaseMs: number): Promise<DeletionQueueJob | null>;
  renewLeaseAsync(jobId: number, workerId: string, leaseMs: number): Promise<boolean>;
  requeueAsync(jobId: number, workerId: string, delayMs: number, lastError?: string): Promise<void>;
  completeAsync(jobId: number, workerId: string): Promise<void>;
}