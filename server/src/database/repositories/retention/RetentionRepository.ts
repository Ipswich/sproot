import type { IRetentionRepository } from "./IRetentionRepository";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";
import { Knex } from "knex";

interface RawWithExec {
  exec(): Promise<void>;
}

const TABLE_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateTableName(tableName: string): string {
  if (!TABLE_NAME_REGEX.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  return tableName;
}

export class RetentionRepository extends BaseKnexRepository implements IRetentionRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async removeRetentionPolicyAsync(tableName: string): Promise<void> {
    const name = validateTableName(tableName);
    await this.connection.raw(`SELECT remove_retention_policy('${name}')`);
  }

  async addRetentionPolicyAsync(tableName: string, interval: string): Promise<void> {
    const name = validateTableName(tableName);
    await this.connection.raw(
      `SELECT add_retention_policy('${name}', drop_after => INTERVAL '${interval}')`,
    );
  }

  async getPolicyJobIdAsync(tableName: string): Promise<number | null> {
    const name = validateTableName(tableName);
    const result = await this.connection<{ job_id: number }[]>("timescaledb_information.jobs")
      .select("job_id")
      .where("proc_name", "policy_retention")
      .where("hypertable_name", name)
      .first();

    return result?.job_id ?? null;
  }

  async runPolicyJobAsync(jobId: number): Promise<void> {
    await (this.connection.raw("CALL run_job(?)", [jobId]) as unknown as RawWithExec).exec();
  }
}
