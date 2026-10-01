import type { ISensorsRepository } from "./ISensorsRepository";
import { SDBReading } from "@sproot/common/database/SDBReading";
import { SDBSensor } from "@sproot/common/database/SDBSensor";
import { ISensorBase } from "@sproot/common/sensors/ISensorBase";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { Knex } from "knex";
import {
  BUCKET_MINUTES_TO_SENSOR_TABLE,
  SENSOR_AGGREGATE_TABLES,
  SensorDataQueryRequest,
  SensorDataQueryResponse,
} from "@sproot/common/api/v2/QueryTypes";
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

export class SensorsRepository extends BaseKnexRepository implements ISensorsRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAllAsync(): Promise<SDBSensor[]> {
    const sensors = await this.connection("sensors")
      .select("*", "subcontroller_id as subcontrollerId")
      .where("pendingDeletion", false);
    return this.normalizeSensors(sensors);
  }

  async getByIdAsync(id: number): Promise<SDBSensor[]> {
    const sensors = await this.connection("sensors")
      .select("*", "subcontroller_id as subcontrollerId")
      .where("id", id)
      .andWhere("pendingDeletion", false);
    return this.normalizeSensors(sensors);
  }

  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    const sensors = await this.connection("sensors as s")
      .leftJoin("subcontrollers as ed", "s.subcontroller_id", "ed.id")
      .select("s.*", "subcontroller_id as subcontrollerId", "ed.hostName")
      .where("s.pendingDeletion", false)
      .whereIn("s.model", ["DS18B20", "ESP32_DS18B20"]);
    return this.normalizeSensors(sensors);
  }

  async addAsync(sensor: SDBSensor): Promise<void> {
    return this.connection("sensors").insert({
      name: sensor.name,
      model: sensor.model,
      subcontroller_id: sensor.subcontrollerId ?? null,
      address: sensor.address,
      color: sensor.color,
      pin: sensor.pin,
      deviceZoneId: sensor.deviceZoneId ?? null,
      lowCalibrationPoint: sensor.lowCalibrationPoint,
      highCalibrationPoint: sensor.highCalibrationPoint,
    });
  }

  async updateAsync(sensor: SDBSensor): Promise<boolean> {
    const updatedRows = await this.connection("sensors")
      .where("id", sensor.id)
      .andWhere("pendingDeletion", false)
      .update({
        name: sensor.name,
        model: sensor.model,
        subcontroller_id: sensor.subcontrollerId ?? null,
        address: sensor.address,
        color: sensor.color,
        pin: sensor.pin,
        deviceZoneId: sensor.deviceZoneId ?? null,
        lowCalibrationPoint: sensor.lowCalibrationPoint,
        highCalibrationPoint: sensor.highCalibrationPoint,
      });

      return updatedRows > 0;
  }

  async updateSensorCalibrationAsync(
    sensorId: number,
    lowCalibrationPoint: number | null,
    highCalibrationPoint: number | null,
  ): Promise<void> {
    return this.connection("sensors")
      .where("id", sensorId)
      .andWhere("pendingDeletion", false)
      .update({
        lowCalibrationPoint,
        highCalibrationPoint,
      });
  }

  async deleteAsync(id: number): Promise<void> {
    return this.connection("sensors").where("id", id).delete();
  }

  async requestDeletionAsync(
    id: number,
    deletionQueueRepository: IDeletionQueueRepository,
  ): Promise<DeletionRequestResult> {
    return this.connection.transaction(async (trx) => {
      const updatedRows = await trx("sensors")
        .where("id", id)
        .andWhere("pendingDeletion", false)
        .update({
          pendingDeletion: true,
          pendingDeletionStartedAt: this.getCurrentTimestampValue(),
        })
        .returning<{ id: number }[]>("id");

      if (updatedRows.length > 0) {
        await deletionQueueRepository.enqueueAsync(trx, "sensor", id);
        return "queued";
      }

      const existingRow = await trx("sensors").select("pendingDeletion").where("id", id).first();
      return existingRow ? "already-pending" : "not-found";
    });
  }

  async cleanupPendingDeletionDependenciesAsync(id: number): Promise<void> {
    await this.connection.transaction(async (trx) => {
      await trx("sensor_conditions").where("sensor_id", id).delete();
    });
  }

  async deletePendingDeletionDataBatchAsync(id: number, batchSize: number): Promise<number> {
    return this.#deleteSensorDataBatchAsync(id, batchSize);
  }

  async finalizePendingDeletionAsync(id: number): Promise<void> {
    await this.connection("sensors").where("id", id).andWhere("pendingDeletion", true).delete();
  }

  async #deleteSensorDataBatchAsync(id: number, batchSize: number): Promise<number> {
    const result = await this.connection.raw(
      `
        WITH deleted AS (
          DELETE FROM sensor_data
          WHERE id IN (
            SELECT id
            FROM sensor_data
            WHERE sensor_id = ?
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

  async addSensorReadingAsync(sensor: ISensorBase): Promise<void> {
    const promises = [];
    for (const readingType in sensor.lastReading) {
      const readingValue = sensor.lastReading[readingType as ReadingType];
      const readingUnits = sensor.units[readingType as ReadingType];
      if (readingValue == null || readingUnits == null) {
        continue;
      }

      promises.push(
        this.connection.raw(
          `
            INSERT INTO sensor_data (sensor_id, metric, data, units, "logTime")
            SELECT id, ?, ?, ?, ?
            FROM sensors
            WHERE id = ?
              AND "pendingDeletion" = false
          `,
          [
            readingType,
            readingValue,
            readingUnits,
            this.getCurrentTimestampValue(),
            sensor.id,
          ],
        ),
      );
    }
    await Promise.allSettled(promises);
  }

  async getSensorReadingsAsync(
    sensor: ISensorBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean = false,
  ): Promise<SDBReading[]> {
    const readings = await this.connection("sensors as s")
      .join("sensor_data as d", "s.id", "d.sensor_id")
      .select("metric", "data", "units", "logTime")
      .where("s.pendingDeletion", false)
      .where("d.logTime", ">", getLookbackDate(since, minutes))
      .andWhere("d.sensor_id", sensor.id)
      .orderBy("d.logTime", "asc");

    return this.normalizeReadings(readings, toIsoString);
  }

  async getBucketedSensorReadingsAsync(
    sensor: ISensorBase | { id: number },
    since: Date,
    minutes: number,
    bucketMinutes: number,
    toIsoString: boolean = false,
  ): Promise<SDBReading[]> {
    const bucketInterval = normalizeBucketMinutes(bucketMinutes);
    const aggregateViewName = BUCKET_MINUTES_TO_SENSOR_TABLE[bucketInterval] ?? null;
    if (!aggregateViewName) {
      return this.getSensorReadingsAsync(sensor, since, minutes, toIsoString);
    }

    const lookbackDate = getLookbackDate(since, minutes);
    const tailStart = getRecentTailStart(since, minutes, bucketInterval);
    const [aggregateResult, tailResult] = await Promise.all([
      this.connection.raw(
        `
          SELECT
            a.bucket AS "logTime",
            a.metric,
            COALESCE(raw.data::text, a.average_data::text) AS data,
            COALESCE(raw.units, a.units) AS units
          FROM ${aggregateViewName} a
          JOIN sensors s
            ON s.id = a.sensor_id
          LEFT JOIN sensor_data raw
            ON raw.sensor_id = a.sensor_id
            AND raw.metric = a.metric
            AND raw."logTime" = a.last_log_time
          WHERE s."pendingDeletion" = false
            AND a.sensor_id = ?
            AND a.bucket > ?
          ORDER BY a.bucket ASC, a.metric ASC
        `,
        [sensor.id, lookbackDate],
      ),
      this.connection.raw(
        `
          SELECT DISTINCT ON (
            time_bucket(INTERVAL '${bucketInterval} minutes', d."logTime"),
            d.metric
          )
            time_bucket(INTERVAL '${bucketInterval} minutes', d."logTime") AS "logTime",
            d.metric,
            d.data::text AS data,
            d.units
          FROM sensor_data d
          JOIN sensors s
            ON s.id = d.sensor_id
          WHERE s."pendingDeletion" = false
            AND d.sensor_id = ?
            AND d."logTime" > ?
          ORDER BY
            time_bucket(INTERVAL '${bucketInterval} minutes', d."logTime") ASC,
            d.metric ASC,
            d."logTime" DESC
        `,
        [sensor.id, tailStart],
      ),
    ]);

    return this.normalizeReadings(
      this.mergeSensorReadings(
        this.getRawRows<SDBReading>(aggregateResult),
        this.getRawRows<SDBReading>(tailResult),
      ),
      toIsoString,
    );
  }

  async getDataAsync(request: SensorDataQueryRequest): Promise<SensorDataQueryResponse> {
    const tableName = SENSOR_AGGREGATE_TABLES[request.downsample ?? "5m"];
    if (tableName) {
      return this.querySensorDataAggregateAsync(request, tableName);
    }
    return this.querySensorDataRawAsync(request, request.downsample ?? "5m");
  }
}
