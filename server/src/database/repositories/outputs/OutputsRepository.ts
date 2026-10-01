import {
  BUCKET_MINUTES_TO_OUTPUT_TABLE,
  OUTPUT_AGGREGATE_TABLES,
  OutputDataQueryRequest,
  OutputDataQueryResponse,
} from "@sproot/common/api/v2/QueryTypes";
import type { IOutputsRepository } from "./IOutputsRepository";
import { SDBOutput } from "@sproot/common/database/SDBOutput";
import { SDBOutputState } from "@sproot/common/database/SDBOutputState";
import { ControlMode, IOutputBase } from "@sproot/common/outputs/IOutputBase";
import { Knex } from "knex";
import {
  getLookbackDate,
  getRecentTailStart,
  normalizeBucketMinutes,
} from "../../databaseQueryUtils";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";
import {
  DeletionRequestResult,
  IDeletionQueueRepository,
} from "../deletion-queue/IDeletionQueueRepository";

export class OutputsRepository extends BaseKnexRepository implements IOutputsRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAllAsync(): Promise<SDBOutput[]> {
    return this.connection("outputs")
      .select("*", "subcontroller_id as subcontrollerId")
      .where("pendingDeletion", false);
  }

  async getByIdAsync(id: number): Promise<SDBOutput[]> {
    return this.connection("outputs")
      .select("*", "subcontroller_id as subcontrollerId")
      .where("id", id)
      .andWhere("pendingDeletion", false);
  }

  async addAsync(output: SDBOutput): Promise<number> {
    return this.insertAndGetIdAsync("outputs", {
      name: output.name,
      model: output.model,
      subcontroller_id: output.subcontrollerId ?? null,
      address: output.address,
      color: output.color,
      pin: output.pin,
      deviceZoneId: output.deviceZoneId ?? null,
      isPwm: output.isPwm,
      isInvertedPwm: output.isInvertedPwm,
      automationTimeout: output.automationTimeout,
    });
  }

  async updateAsync(output: SDBOutput): Promise<boolean> {
    if (output.parentOutputId === output.id) {
      throw new Error("Output cannot be its own parent");
    }

    const updatedRows = await this.connection("outputs")
      .where("id", output.id)
      .andWhere("pendingDeletion", false)
      .update({
        name: output.name,
        model: output.model,
        subcontroller_id: output.subcontrollerId ?? null,
        address: output.address,
        color: output.color,
        pin: output.pin,
        deviceZoneId: output.deviceZoneId ?? null,
        parentOutputId: output.parentOutputId ?? null,
        isPwm: output.isPwm,
        isInvertedPwm: output.isInvertedPwm,
        automationTimeout: output.automationTimeout,
      });

      return updatedRows > 0;
  }

  async deleteAsync(id: number): Promise<void> {
    return this.connection("outputs").where("id", id).delete();
  }

  async requestDeletionAsync(
    id: number,
    deletionQueueRepository: IDeletionQueueRepository,
  ): Promise<DeletionRequestResult> {
    return this.connection.transaction(async (trx) => {
      const updatedRows = await trx("outputs")
        .where("id", id)
        .andWhere("pendingDeletion", false)
        .update({
          pendingDeletion: true,
          pendingDeletionStartedAt: this.getCurrentTimestampValue(),
        })
        .returning<{ id: number }[]>("id");

      if (updatedRows.length > 0) {
        await deletionQueueRepository.enqueueAsync(trx, "output", id);
        return "queued";
      }

      const existingRow = await trx("outputs").select("pendingDeletion").where("id", id).first();
      return existingRow ? "already-pending" : "not-found";
    });
  }

  async cleanupPendingDeletionDependenciesAsync(id: number): Promise<void> {
    await this.connection.transaction(async (trx) => {
      await trx("outputs").where("parentOutputId", id).update({ parentOutputId: null });
      await trx("output_actions").where("output_id", id).delete();
      await trx("output_conditions").where("output_id", id).delete();
    });
  }

  async deletePendingDeletionDataBatchAsync(id: number, batchSize: number): Promise<number> {
    return this.#deleteOutputDataBatchAsync(id, batchSize);
  }

  async finalizePendingDeletionAsync(id: number): Promise<void> {
    await this.connection("outputs").where("id", id).andWhere("pendingDeletion", true).delete();
  }

  async #deleteOutputDataBatchAsync(id: number, batchSize: number): Promise<number> {
    const result = await this.connection.raw(
      `
        WITH deleted AS (
          DELETE FROM output_data
          WHERE id IN (
            SELECT id
            FROM output_data
            WHERE output_id = ?
            LIMIT ?
          )
          RETURNING 1
        )
        SELECT COUNT(*)::int AS deleted_count FROM deleted
      `,
      [id, batchSize],
    );

    const rows = this.getRawRows<{ deleted_count: number | string }>(result);
    const deletedCount = rows[0]?.deleted_count ?? 0;
    return typeof deletedCount === "string" ? parseInt(deletedCount, 10) : deletedCount;
  }

  async addOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    await this.connection.raw(
      `
        INSERT INTO output_data (output_id, value, "controlMode", "logTime")
        SELECT id, ?, ?, ?
        FROM outputs
        WHERE id = ?
          AND "pendingDeletion" = false
      `,
      [output.value, output.controlMode, this.getCurrentTimestampValue(), output.id],
    );
  }

  async updateLastOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return this.connection("outputs")
      .where("id", output.id)
      .andWhere("pendingDeletion", false)
      .update({
        lastValue: output.value,
        lastControlMode: output.controlMode,
        lastStateUpdate: this.getCurrentTimestampValue(),
      });
  }

  async getLastOutputStateAsync(outputId: number): Promise<SDBOutputState[]> {
    const rows = await this.connection("outputs")
      .where("id", outputId)
      .andWhere("pendingDeletion", false)
      .select("lastControlMode as controlMode", "lastValue as value", "lastStateUpdate as logTime");
    return rows.map((row: SDBOutputState) => ({
      ...row,
      logTime: this.normalizeLogTime(row.logTime, true),
    }));
  }

  async getOutputStatesAsync(
    output: IOutputBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean = false,
  ): Promise<SDBOutputState[]> {
    const states = await this.connection("outputs as o")
      .join("output_data as d", "o.id", "d.output_id")
      .select("d.value", "d.controlMode", "d.logTime")
      .where("o.pendingDeletion", false)
      .where("d.logTime", ">", getLookbackDate(since, minutes))
      .andWhere("d.output_id", output.id)
      .orderBy("d.logTime", "asc");

    return this.normalizeOutputStates(states, toIsoString);
  }

  async getBucketedOutputStatesAsync(
    output: IOutputBase | { id: number },
    since: Date,
    minutes: number,
    bucketMinutes: number,
    toIsoString: boolean = false,
  ): Promise<SDBOutputState[]> {
    const bucketInterval = normalizeBucketMinutes(bucketMinutes);
    const aggregateViewName = BUCKET_MINUTES_TO_OUTPUT_TABLE[bucketInterval] ?? null;
    if (!aggregateViewName) {
      return this.getOutputStatesAsync(output, since, minutes, toIsoString);
    }

    const lookbackDate = getLookbackDate(since, minutes);
    const tailStart = getRecentTailStart(since, minutes, bucketInterval);
    const [aggregateResult, tailResult] = await Promise.all([
      this.connection.raw(
        `
          SELECT
            a.bucket AS "logTime",
            raw.value,
            raw."controlMode"
          FROM ${aggregateViewName} a
          JOIN outputs o
            ON o.id = a.output_id
          LEFT JOIN output_data raw
            ON raw.output_id = a.output_id
            AND raw."logTime" = a.last_log_time
          WHERE o."pendingDeletion" = false
            AND a.output_id = ?
            AND a.bucket > ?
          ORDER BY a.bucket ASC
        `,
        [output.id, lookbackDate],
      ),
      this.connection.raw(
        `
          SELECT DISTINCT ON (time_bucket(INTERVAL '${bucketInterval} minutes', d."logTime"))
            time_bucket(INTERVAL '${bucketInterval} minutes', d."logTime") AS "logTime",
            d.value,
            d."controlMode"
          FROM output_data d
          JOIN outputs o
            ON o.id = d.output_id
          WHERE o."pendingDeletion" = false
            AND d.output_id = ?
            AND d."logTime" > ?
          ORDER BY
            time_bucket(INTERVAL '${bucketInterval} minutes', d."logTime") ASC,
            d."logTime" DESC
        `,
        [output.id, tailStart],
      ),
    ]);

    return this.normalizeOutputStates(
      this.mergeOutputStates(
        this.getRawRows<SDBOutputState>(aggregateResult),
        this.getRawRows<SDBOutputState>(tailResult),
      ),
      toIsoString,
    );
  }

  async getDataAsync(request: OutputDataQueryRequest): Promise<OutputDataQueryResponse> {
    const tableName = OUTPUT_AGGREGATE_TABLES[request.downsample ?? "5m"];
    if (tableName) {
      return this.queryOutputDataAggregateAsync(request, tableName);
    }
    return this.queryOutputDataRawAsync(request, request.downsample ?? "5m");
  }
}
