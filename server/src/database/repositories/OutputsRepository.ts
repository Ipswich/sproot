import { BUCKET_MINUTES_TO_OUTPUT_TABLE } from "@sproot/sproot-common/dist/api/v2/QueryTypes";
import { IOutputsRepository } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ControlMode, IOutputBase } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { Knex } from "knex";
import { getLookbackDate, getRecentTailStart, normalizeBucketMinutes } from "../databaseQueryUtils";
import { BaseKnexRepository } from "./BaseKnexRepository";

export class OutputsRepository extends BaseKnexRepository implements IOutputsRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getOutputsAsync(): Promise<SDBOutput[]> {
    return this.connection("outputs").select("*", "subcontroller_id as subcontrollerId");
  }

  async getOutputAsync(id: number): Promise<SDBOutput[]> {
    return this.connection("outputs")
      .select("*", "subcontroller_id as subcontrollerId")
      .where("id", id);
  }

  async addOutputAsync(output: SDBOutput): Promise<number> {
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

  async updateOutputAsync(output: SDBOutput): Promise<void> {
    if (output.parentOutputId === output.id) {
      throw new Error("Output cannot be its own parent");
    }

    return this.connection("outputs")
      .where("id", output.id)
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
  }

  async deleteOutputAsync(id: number): Promise<void> {
    return this.connection("outputs").where("id", id).delete();
  }

  async addOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return this.connection("output_data").insert({
      output_id: output.id,
      value: output.value,
      controlMode: output.controlMode,
      logTime: this.getCurrentTimestampValue(),
    });
  }

  async updateLastOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return this.connection("outputs").where("id", output.id).update({
      lastValue: output.value,
      lastControlMode: output.controlMode,
      lastStateUpdate: this.getCurrentTimestampValue(),
    });
  }

  async getLastOutputStateAsync(outputId: number): Promise<SDBOutputState[]> {
    const rows = await this.connection("outputs")
      .where("id", outputId)
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
          LEFT JOIN output_data raw
            ON raw.output_id = a.output_id
            AND raw."logTime" = a.last_log_time
          WHERE a.output_id = ?
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
          WHERE d.output_id = ?
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
}