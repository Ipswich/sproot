/**
 * Contract for TimescaleDB retention policy operations.
 * Encapsulates all SQL queries related to data retention policies on hypertables.
 */
export interface IRetentionRepository {
  /**
   * Check if a retention policy exists for a hypertable.
   * Returns true if a retention policy job is found, false otherwise.
   */
  hasRetentionPolicyAsync(tableName: string): Promise<boolean>;

  /**
   * Remove the retention policy from a hypertable (or no-op if none exists).
   */
  removeRetentionPolicyAsync(tableName: string): Promise<void>;

  /**
   * Add a retention policy to a hypertable that drops chunks older than the given interval.
   */
  addRetentionPolicyAsync(tableName: string, interval: string): Promise<void>;

  /**
   * Look up the job_id for a retention policy associated with a hypertable.
   * Returns null if no retention policy job is found for the table.
   */
  getPolicyJobIdAsync(tableName: string): Promise<number | null>;

  /**
   * Immediately execute a retention policy job by its ID.
   */
  runPolicyJobAsync(jobId: number): Promise<void>;
}
