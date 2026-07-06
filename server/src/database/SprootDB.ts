import { SDBUser } from "@sproot/sproot-common/dist/database/SDBUser";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ISensorBase } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { ControlMode, IOutputBase } from "@sproot/outputs/IOutputBase";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { SDBOutputCondition } from "@sproot/sproot-common/dist/database/SDBOutputCondition";
import { SDBSensorCondition } from "@sproot/sproot-common/dist/database/SDBSensorCondition";
import { SDBTimeCondition } from "@sproot/sproot-common/dist/database/SDBTimeCondition";
import { SDBWeekdayCondition } from "@sproot/database/SDBWeekdayCondition";
import { SDBMonthCondition } from "@sproot/database/SDBMonthCondition";
import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";
import { AutomationOperator } from "@sproot/automation/IAutomation";
import {
  SDBOutputAction,
  SDBOutputActionView,
} from "@sproot/sproot-common/dist/database/SDBOutputAction";
import { Knex } from "knex";
import { IOutputCondition } from "@sproot/automation/IOutputCondition";
import { ISensorCondition } from "@sproot/automation/ISensorCondition";
import { ITimeCondition } from "@sproot/automation/ITimeCondition";
import { IWeekdayCondition } from "@sproot/automation/IWeekdayCondition";
import { IMonthCondition } from "@sproot/automation/IMonthCondition";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { SDBSubcontroller } from "@sproot/database/SDBSubcontroller";
import { encrypt, decrypt } from "@sproot/sproot-common/dist/utility/Crypto";
import { IDateRangeCondition } from "@sproot/automation/IDateRangeCondition";
import { SDBDateRangeCondition } from "@sproot/database/SDBDateRangeCondition";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { toDbDate, dbToIso, isoToDb } from "../utils/dateUtils";
import { SDBDeviceZone } from "@sproot/database/SDBDeviceZone";
import { SDBJournal } from "@sproot/sproot-common/dist/database/SDBJournal";
import { SDBJournalTag } from "@sproot/sproot-common/dist/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/sproot-common/dist/database/SDBJournalTagLookup";
import { SDBJournalEntry } from "@sproot/sproot-common/dist/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import { SDBJournalEntryTagLookup } from "@sproot/sproot-common/dist/database/SDBJournalEntryTagLookup";
import { SDBNotificationAction } from "@sproot/sproot-common/dist/database/SDBNotificationAction";
import {
  SensorDataQueryRequest,
  OutputDataQueryRequest,
  SensorDataQueryResponse,
  OutputDataQueryResponse,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DEFAULT_AGGREGATES,
  Aggregate,
  SENSOR_AGGREGATE_TABLES,
  OUTPUT_AGGREGATE_TABLES,
  BUCKET_MINUTES_TO_SENSOR_TABLE,
  BUCKET_MINUTES_TO_OUTPUT_TABLE,
} from "@sproot/sproot-common/dist/api/v2/QueryTypes";

import {
  formatSensorAggregateRows,
  formatOutputAggregateRows,
  normalizeBucketMinutes,
  getLookbackDate,
  getRecentTailStart,
} from "./databaseQueryUtils";

import {
  buildSensorRawQuery,
  buildOutputRawQuery,
} from "./rawDataQueryHelpers";

import * as winston from "winston";

// ---------------------------------------------------------------------------
// Generic data query configuration
// ---------------------------------------------------------------------------

interface DataQueryConfig<T> {
  tableName: string;
  selectColumns: (string | Knex.Raw)[];
  whereRaw: Knex.Raw;
  limit: number;
  cursorColumn: string;
  aggregates: Aggregate[];
  groupByRaw?: string;
  groupByValues?: unknown[];
  formatRows: (
    rows: Array<Record<string, unknown>>,
    aggregates: Aggregate[],
    nextCursor: string | undefined,
  ) => T;
}

export class SprootDB implements ISprootDB {
  #connection: Knex;

  constructor(connection: Knex) {
    this.#connection = connection;
  }

  async getSensorsAsync(): Promise<SDBSensor[]> {
    const sensors = await this.#connection("sensors").select(
      "*",
      "subcontroller_id as subcontrollerId",
    );
    return this.#normalizeSensors(sensors);
  }
  async getSensorAsync(id: number): Promise<SDBSensor[]> {
    const sensors = await this.#connection("sensors")
      .select("*", "subcontroller_id as subcontrollerId")
      .where("id", id);
    return this.#normalizeSensors(sensors);
  }
  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    const sensors = await this.#connection("sensors as s")
      .leftJoin("subcontrollers as ed", "s.subcontroller_id", "ed.id")
      .select("s.*", "subcontroller_id as subcontrollerId", "ed.hostName")
      .whereIn("s.model", ["DS18B20", "ESP32_DS18B20"]);
    return this.#normalizeSensors(sensors);
  }
  async addSensorAsync(sensor: SDBSensor): Promise<void> {
    return this.#connection("sensors").insert({
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
  async updateSensorAsync(sensor: SDBSensor): Promise<void> {
    return this.#connection("sensors")
      .where("id", sensor.id)
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
  }

  async updateSensorCalibrationAsync(
    sensorId: number,
    lowCalibrationPoint: number | null,
    highCalibrationPoint: number | null,
  ): Promise<void> {
    return this.#connection("sensors").where("id", sensorId).update({
      lowCalibrationPoint: lowCalibrationPoint,
      highCalibrationPoint: highCalibrationPoint,
    });
  }

  async deleteSensorAsync(id: number): Promise<void> {
    return this.#connection("sensors").where("id", id).delete();
  }

  async getSubcontrollersAsync(): Promise<SDBSubcontroller[]> {
    const result = await this.#connection("subcontrollers").select("*");
    result.forEach((device: SDBSubcontroller) => {
      device.secureToken =
        device.secureToken == null ? null : decrypt(device.secureToken, process.env["JWT_SECRET"]!);
    });
    return result;
  }

  async addSubcontrollerAsync(subcontroller: SDBSubcontroller): Promise<number> {
    const copy = { ...subcontroller };
    copy.secureToken =
      copy.secureToken == null ? null : encrypt(copy.secureToken, process.env["JWT_SECRET"]!);
    return this.#insertAndGetIdAsync("subcontrollers", copy);
  }

  async deleteSubcontrollersAsync(id: number): Promise<number> {
    return await this.#connection("subcontrollers").where("id", id).delete();
  }

  async updateSubcontrollerAsync(subcontroller: SDBSubcontroller): Promise<number> {
    // Only name can be updated for now
    return await this.#connection("subcontrollers").where("id", subcontroller.id).update({
      name: subcontroller.name,
      type: subcontroller.type,
      hostName: subcontroller.hostName,
    });
  }

  async addSensorReadingAsync(sensor: ISensorBase): Promise<void> {
    const promises = [];
    for (const readingType in sensor.lastReading) {
      promises.push(
        this.#connection("sensor_data").insert({
          sensor_id: sensor.id,
          metric: readingType,
          data: sensor.lastReading[readingType as ReadingType],
          units: sensor.units[readingType as ReadingType],
          logTime: this.#getCurrentTimestampValue(),
        }),
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
    const readings = await this.#connection("sensors as s")
      .join("sensor_data as d", "s.id", "d.sensor_id")
      .select("metric", "data", "units", "logTime")
      .where("d.logTime", ">", getLookbackDate(since, minutes))
      .andWhere("d.sensor_id", sensor.id)
      .orderBy("d.logTime", "asc");

    return this.#normalizeReadings(readings, toIsoString);
  }
  async getSensorChartReadingsAsync(
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
      this.#connection.raw(
        `
          SELECT
            a.bucket AS "logTime",
            a.metric,
            COALESCE(raw.data::text, a.average_data::text) AS data,
            COALESCE(raw.units, a.units) AS units
          FROM ${aggregateViewName} a
          LEFT JOIN sensor_data raw
            ON raw.sensor_id = a.sensor_id
            AND raw.metric = a.metric
            AND raw."logTime" = a.last_log_time
          WHERE a.sensor_id = ?
            AND a.bucket > ?
          ORDER BY a.bucket ASC, a.metric ASC
        `,
        [sensor.id, lookbackDate],
      ),
      this.#connection.raw(
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
          WHERE d.sensor_id = ?
            AND d."logTime" > ?
          ORDER BY
            time_bucket(INTERVAL '${bucketInterval} minutes', d."logTime") ASC,
            d.metric ASC,
            d."logTime" DESC
        `,
        [sensor.id, tailStart],
      ),
    ]);

    return this.#normalizeReadings(
      this.#mergeSensorChartReadings(
        this.#getRawRows<SDBReading>(aggregateResult),
        this.#getRawRows<SDBReading>(tailResult),
      ),
      toIsoString,
    );
  }
  async getOutputsAsync(): Promise<SDBOutput[]> {
    return this.#connection("outputs").select("*", "subcontroller_id as subcontrollerId");
  }
  async getOutputAsync(id: number): Promise<SDBOutput[]> {
    return this.#connection("outputs")
      .select("*", "subcontroller_id as subcontrollerId")
      .where("id", id);
  }
  async addOutputAsync(output: SDBOutput): Promise<number> {
    return this.#insertAndGetIdAsync("outputs", {
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

    return this.#connection("outputs")
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
    return this.#connection("outputs").where("id", id).delete();
  }
  async getDeviceZonesAsync(): Promise<SDBDeviceZone[]> {
    return this.#connection("device_zones").select("*");
  }
  async addDeviceZoneAsync(name: string): Promise<number> {
    return this.#insertAndGetIdAsync("device_zones", { name });
  }
  async updateDeviceZoneAsync(deviceZone: SDBDeviceZone): Promise<void> {
    return this.#connection("device_zones")
      .where("id", deviceZone.id)
      .update({ name: deviceZone.name });
  }
  async deleteDeviceZoneAsync(id: number): Promise<void> {
    return this.#connection("device_zones").where("id", id).delete();
  }

  /* Journals */
  async getJournalsAsync(): Promise<SDBJournal[]> {
    return (await this.#connection("journals").select("*")).map((j: SDBJournal) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      archived: j.archived,
      icon: j.icon,
      color: j.color,
      createdAt: dbToIso(j.createdAt)!,
      editedAt: dbToIso(j.editedAt)!,
      archivedAt: dbToIso(j.archivedAt),
    }));
  }

  async getJournalAsync(id: number): Promise<SDBJournal[]> {
    const results = await this.#connection("journals").where("id", id).select("*");
    return (results as SDBJournal[]).map((j: SDBJournal) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      archived: j.archived,
      icon: j.icon,
      color: j.color,
      createdAt: dbToIso(j.createdAt)!,
      editedAt: dbToIso(j.editedAt)!,
      archivedAt: dbToIso(j.archivedAt),
    }));
  }

  async addJournalAsync(
    title: string,
    description: string | null,
    icon: string | null,
    color: string | null,
    createdAt?: string | null,
  ): Promise<number> {
    return this.#insertAndGetIdAsync("journals", {
      title,
      description,
      archived: false,
      icon,
      color,
      createdAt: createdAt ?? toDbDate(),
      editedAt: createdAt ?? toDbDate(),
      archivedAt: null,
    });
  }

  async updateJournalAsync(journal: SDBJournal): Promise<void> {
    const archivedAt = journal.archived ? (isoToDb(journal.archivedAt) ?? toDbDate()) : null;
    return this.#connection("journals")
      .where("id", journal.id)
      .update({
        title: journal.title,
        description: journal.description,
        archived: journal.archived,
        icon: journal.icon,
        color: journal.color,
        editedAt: isoToDb(journal.editedAt),
        archivedAt: archivedAt,
      });
  }

  async deleteJournalAsync(id: number): Promise<void> {
    return this.#connection("journals").where("id", id).delete();
  }

  async getJournalTagsAsync(): Promise<SDBJournalTag[]> {
    return this.#connection("journal_tags").select("*");
  }

  async addJournalTagAsync(name: string, color: string | null): Promise<number> {
    return this.#insertAndGetIdAsync("journal_tags", { name, color });
  }

  async updateJournalTagAsync(tag: SDBJournalTag): Promise<void> {
    return this.#connection("journal_tags")
      .where("id", tag.id)
      .update({ name: tag.name, color: tag.color });
  }

  async deleteJournalTagAsync(id: number): Promise<void> {
    return this.#connection("journal_tags").where("id", id).delete();
  }

  async getJournalTagLookupsAsync(): Promise<SDBJournalTagLookup[]> {
    return this.#connection("journal_tag_lookup").select(
      "id",
      "journal_id as journalId",
      "tag_id as tagId",
    );
  }
  async addJournalTagLookupAsync(journalId: number, tagId: number): Promise<number> {
    return this.#insertAndGetIdAsync("journal_tag_lookup", {
      journal_id: journalId,
      tag_id: tagId,
    });
  }

  async deleteJournalTagLookupAsync(journalId: number, tagId: number): Promise<void> {
    return this.#connection("journal_tag_lookup")
      .where({ journal_id: journalId, tag_id: tagId })
      .delete();
  }

  async getJournalEntriesAsync(
    journalId: number,
    withContent?: boolean,
  ): Promise<SDBJournalEntry[]> {
    let results: SDBJournalEntry[] = [];
    if (!withContent) {
      results = await this.#connection("journal_entries")
        .where("journal_id", journalId)
        .select("id", "journal_id as journalId", "title", "createdAt", "editedAt");
    } else {
      results = await this.#connection("journal_entries")
        .where("journal_id", journalId)
        .select("id", "journal_id as journalId", "title", "content", "createdAt", "editedAt");
    }
    return results.map((entry: SDBJournalEntry) => ({
      ...entry,
      createdAt: dbToIso(entry.createdAt)!,
      editedAt: dbToIso(entry.editedAt)!,
    }));
  }

  async getJournalEntryAsync(entryId: number, withContent?: boolean): Promise<SDBJournalEntry[]> {
    let results: SDBJournalEntry[] = [];
    if (!withContent) {
      results = await this.#connection("journal_entries")
        .where("id", entryId)
        .select("id", "journal_id as journalId", "title", "createdAt", "editedAt");
    } else {
      results = await this.#connection("journal_entries")
        .where("id", entryId)
        .select("id", "journal_id as journalId", "title", "content", "createdAt", "editedAt");
    }
    return results.map((entry: SDBJournalEntry) => ({
      ...entry,
      createdAt: dbToIso(entry.createdAt)!,
      editedAt: dbToIso(entry.editedAt)!,
    }));
  }

  async addJournalEntryAsync(
    journalId: number,
    title: string | null,
    content: string,
    createdAt?: string | null,
  ): Promise<number> {
    //TODO prevent updates if Journal is archived??
    const journalEntryId = await this.#insertAndGetIdAsync("journal_entries", {
      journal_id: journalId,
      title,
      content,
      createdAt: createdAt ?? toDbDate(),
      editedAt: createdAt ?? toDbDate(),
    });
    await this.#connection("journals").where("id", journalId).update({
      editedAt: toDbDate(),
    });

    return journalEntryId;
  }

  async updateJournalEntryAsync(entry: SDBJournalEntry): Promise<void> {
    //TODO prevent updates if Journal is archived??
    await Promise.all([
      this.#connection("journal_entries").where("id", entry.id).update({
        journal_id: entry.journalId,
        title: entry.title,
        content: entry.content,
        editedAt: toDbDate(),
      }),
      this.#connection("journals").where("id", entry.journalId).update({
        editedAt: toDbDate(),
      }),
    ]);
  }

  async deleteJournalEntryAsync(id: number): Promise<void> {
    const entry = await this.#connection("journal_entries")
      .where("id", id)
      .select("journal_id as journalId")
      .first();
    await Promise.all([
      this.#connection("journal_entries").where("id", id).delete(),
      this.#connection("journals").where("id", entry?.journalId).update({
        editedAt: toDbDate(),
      }),
    ]);
  }

  async getJournalEntryTagsAsync(): Promise<SDBJournalEntryTag[]> {
    return this.#connection("journal_entry_tags").select("*");
  }

  async addJournalEntryTagAsync(name: string, color: string | null): Promise<number> {
    return this.#insertAndGetIdAsync("journal_entry_tags", { name, color });
  }

  async updateJournalEntryTagAsync(tag: SDBJournalEntryTag): Promise<void> {
    return this.#connection("journal_entry_tags")
      .where("id", tag.id)
      .update({ name: tag.name, color: tag.color });
  }

  async deleteJournalEntryTagAsync(id: number): Promise<void> {
    return this.#connection("journal_entry_tags").where("id", id).delete();
  }

  async getJournalEntryTagLookupsAsync(): Promise<SDBJournalEntryTagLookup[]> {
    return this.#connection("journal_entry_tag_lookup").select(
      "id",
      "journal_entry_id as journalEntryId",
      "tag_id as tagId",
    );
  }

  async addJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<number> {
    return this.#insertAndGetIdAsync("journal_entry_tag_lookup", {
      journal_entry_id: journalEntryId,
      tag_id: tagId,
    });
  }

  async deleteJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<void> {
    return this.#connection("journal_entry_tag_lookup")
      .where({ journal_entry_id: journalEntryId, tag_id: tagId })
      .delete();
  }

  async addOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return this.#connection("output_data").insert({
      output_id: output.id,
      value: output.value,
      controlMode: output.controlMode,
      logTime: this.#getCurrentTimestampValue(),
    });
  }
  async updateLastOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return this.#connection("outputs").where("id", output.id).update({
      lastValue: output.value,
      lastControlMode: output.controlMode,
      lastStateUpdate: this.#getCurrentTimestampValue(),
    });
  }
  async getLastOutputStateAsync(outputId: number): Promise<SDBOutputState[]> {
    const rows = await this.#connection("outputs")
      .where("id", outputId)
      .select("lastControlMode as controlMode", "lastValue as value", "lastStateUpdate as logTime");
    return rows.map((row: SDBOutputState) => ({
      ...row,
      logTime: dbToIso(row.logTime) ?? "",
    }));
  }
  async getOutputStatesAsync(
    output: IOutputBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean = false,
  ): Promise<SDBOutputState[]> {
    const states = await this.#connection("outputs as o")
      .join("output_data as d", "o.id", "d.output_id")
      .select("d.value", "d.controlMode", "d.logTime")
      .where("d.logTime", ">", getLookbackDate(since, minutes))
      .andWhere("d.output_id", output.id)
      .orderBy("d.logTime", "asc");

    return this.#normalizeOutputStates(states, toIsoString);
  }
  async getOutputChartStatesAsync(
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
      this.#connection.raw(
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
      this.#connection.raw(
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

    return this.#normalizeOutputStates(
      this.#mergeOutputChartStates(
        this.#getRawRows<SDBOutputState>(aggregateResult),
        this.#getRawRows<SDBOutputState>(tailResult),
      ),
      toIsoString,
    );
  }
  async getAutomationsAsync(): Promise<SDBAutomation[]> {
    return this.#connection("automations").select("*");
  }
  async getAutomationAsync(automationId: number): Promise<SDBAutomation[]> {
    return this.#connection("automations").where("id", automationId).select("*");
  }
  async addAutomationAsync(name: string, operator: AutomationOperator): Promise<number> {
    return this.#insertAndGetIdAsync("automations", { name: name, operator });
  }
  async updateAutomationAsync(
    name: string,
    operator: AutomationOperator,
    id: number,
    enabled: boolean,
  ): Promise<void> {
    return this.#connection("automations").where("id", id).update({ name, operator, enabled });
  }
  async deleteAutomationAsync(automationId: number): Promise<void> {
    return this.#connection("automations").where("id", automationId).delete();
  }
  async getOutputActionsAsync(): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions").select([
      "id",
      "automation_id as automationId",
      "output_id as outputId",
      "value",
    ]);
  }
  async getOutputActionsByOutputIdAsync(outputId: number): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions")
      .where("output_id", outputId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }
  async getOutputActionsByAutomationIdAsync(automationId: number): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }
  async getOutputActionAsync(outputActionId: number): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions")
      .where("id", outputActionId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }
  async addOutputActionAsync(
    automationId: number,
    outputId: number,
    value: number,
  ): Promise<number> {
    return this.#insertAndGetIdAsync("output_actions", {
      automation_id: automationId,
      output_id: outputId,
      value,
    });
  }
  async deleteOutputActionAsync(outputActionId: number): Promise<void> {
    return this.#connection("output_actions").where("id", outputActionId).delete();
  }
  async getAutomationsForOutputAsync(outputId: number): Promise<SDBOutputActionView[]> {
    return this.#connection("output_actions_view").where("outputId", outputId).select("*");
  }

  /* Notifications */
  async getNotificationActionsAsync(): Promise<SDBNotificationAction[]> {
    return this.#connection("notification_actions").select([
      "id",
      "automation_id as automationId",
      "subject",
      "content",
    ]);
  }
  async getNotificationActionByIdAsync(
    notificationActionId: number,
  ): Promise<SDBNotificationAction[]> {
    return this.#connection("notification_actions")
      .where("id", notificationActionId)
      .select(["id", "automation_id as automationId", "subject", "content"]);
  }
  async getNotificationActionsByAutomationIdAsync(
    automationId: number,
  ): Promise<SDBNotificationAction[]> {
    return this.#connection("notification_actions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "subject", "content"]);
  }
  async addNotificationActionAsync(
    automationId: number,
    subject: string,
    content: string,
  ): Promise<number> {
    return this.#insertAndGetIdAsync("notification_actions", {
      automation_id: automationId,
      subject,
      content,
    });
  }
  async deleteNotificationActionAsync(notificationActionId: number): Promise<void> {
    return this.#connection("notification_actions").where("id", notificationActionId).delete();
  }
  async getSensorConditionsAsync(automationId: number): Promise<SDBSensorCondition[]> {
    return this.#connection("sensor_conditions as sc")
      .select([
        "sc.id",
        "sc.automation_id as automationId",
        "sc.groupType",
        "sc.operator",
        "sc.comparisonValue",
        "sc.comparisonLookback",
        "sc.sensor_id as sensorId",
        "sc.readingType",
        "s.name as sensorName",
      ])
      .innerJoin("sensors as s", "sc.sensor_id", "s.id")
      .where("automation_id", automationId);
  }
  async addSensorConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    sensorId: number,
    readingType: string,
  ): Promise<number> {
    return this.#insertAndGetIdAsync("sensor_conditions", {
      automation_id: automationId,
      groupType: type,
      operator,
      comparisonValue,
      comparisonLookback,
      sensor_id: sensorId,
      readingType,
    });
  }
  async updateSensorConditionAsync(
    automationId: number,
    condition: ISensorCondition,
  ): Promise<void> {
    return this.#connection("sensor_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        operator: condition.operator,
        comparisonValue: condition.comparisonValue,
        comparisonLookback: condition.comparisonLookback,
        sensor_id: condition.sensorId,
        readingType: condition.readingType,
      });
  }
  async deleteSensorConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("sensor_conditions").where("id", conditionId).delete();
  }
  async getOutputConditionsAsync(automationId: number): Promise<SDBOutputCondition[]> {
    return this.#connection("output_conditions as oc")
      .select([
        "oc.id",
        "oc.automation_id as automationId",
        "oc.groupType",
        "oc.operator",
        "oc.comparisonValue",
        "oc.comparisonLookback",
        "oc.output_id as outputId",
        "o.name as outputName",
      ])
      .innerJoin("outputs as o", "oc.output_id", "o.id")
      .where("automation_id", automationId);
  }
  async addOutputConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    outputId: number,
  ): Promise<number> {
    return this.#insertAndGetIdAsync("output_conditions", {
      automation_id: automationId,
      groupType: type,
      operator,
      comparisonValue,
      comparisonLookback,
      output_id: outputId,
    });
  }
  async updateOutputConditionAsync(
    automationId: number,
    condition: IOutputCondition,
  ): Promise<void> {
    return this.#connection("output_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        operator: condition.operator,
        comparisonValue: condition.comparisonValue,
        comparisonLookback: condition.comparisonLookback,
        output_id: condition.outputId,
      });
  }
  async deleteOutputConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("output_conditions").where("id", conditionId).delete();
  }
  async getTimeConditionsAsync(automationId: number): Promise<SDBTimeCondition[]> {
    return this.#connection("time_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "startTime", "endTime"]);
  }
  async addTimeConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    endTime: string | undefined | null,
  ): Promise<number> {
    return this.#insertAndGetIdAsync("time_conditions", {
      automation_id: automationId,
      groupType: type,
      startTime,
      endTime,
    });
  }
  async updateTimeConditionAsync(automationId: number, condition: ITimeCondition): Promise<void> {
    return this.#connection("time_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        startTime: condition.startTime,
        endTime: condition.endTime,
      });
  }
  async deleteTimeConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("time_conditions").where("id", conditionId).delete();
  }
  async getWeekdayConditionsAsync(automationId: number): Promise<SDBWeekdayCondition[]> {
    return this.#connection("weekday_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "weekdays"]);
  }
  async addWeekdayConditionAsync(
    automationId: number,
    groupType: ConditionGroupType,
    weekdays: number,
  ): Promise<number> {
    return this.#insertAndGetIdAsync("weekday_conditions", {
      automation_id: automationId,
      groupType,
      weekdays,
    });
  }
  async updateWeekdayConditionAsync(
    automationId: number,
    condition: IWeekdayCondition,
  ): Promise<void> {
    return this.#connection("weekday_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        weekdays: condition.weekdays,
      });
  }
  async deleteWeekdayConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("weekday_conditions").where("id", conditionId).delete();
  }

  async getMonthConditionsAsync(automationId: number): Promise<SDBMonthCondition[]> {
    return this.#connection("month_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "months"]);
  }
  async addMonthConditionAsync(
    automationId: number,
    groupType: ConditionGroupType,
    months: number,
  ): Promise<number> {
    return this.#insertAndGetIdAsync("month_conditions", {
      automation_id: automationId,
      groupType,
      months,
    });
  }
  async updateMonthConditionAsync(automationId: number, condition: IMonthCondition): Promise<void> {
    return this.#connection("month_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        months: condition.months,
      });
  }
  async deleteMonthConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("month_conditions").where("id", conditionId).delete();
  }

  async getDateRangeConditionsAsync(automationId: number): Promise<SDBDateRangeCondition[]> {
    return this.#connection("date_range_conditions")
      .where("automation_id", automationId)
      .select([
        "id",
        "automation_id as automationId",
        "groupType",
        "startMonth",
        "startDate",
        "endMonth",
        "endDate",
      ]);
  }
  async addDateRangeConditionAsync(
    automationId: number,
    groupType: ConditionGroupType,
    startMonth: number,
    startDate: number,
    endMonth: number,
    endDate: number,
  ): Promise<number> {
    return this.#insertAndGetIdAsync("date_range_conditions", {
      automation_id: automationId,
      groupType,
      startMonth,
      startDate,
      endMonth,
      endDate,
    });
  }
  async updateDateRangeConditionAsync(
    automationId: number,
    condition: IDateRangeCondition,
  ): Promise<void> {
    return this.#connection("date_range_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        startMonth: condition.startMonth,
        startDate: condition.startDate,
        endMonth: condition.endMonth,
        endDate: condition.endDate,
      });
  }
  async deleteDateRangeConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("date_range_conditions").where("id", conditionId).delete();
  }

  async getCameraSettingsAsync(): Promise<SDBCameraSettings[]> {
    return this.#connection("camera_settings").select("*");
  }

  // async addCameraSettingsAsync(
  //   name: string,
  //   xVideoResolution: number | null,
  //   yVideoResolution: number | null,
  //   videoFps: number,
  //   xImageResolution: number | null,
  //   yImageResolution: number | null,
  //   imageRetentionDays: number,
  //   imageRetentionSize: number,
  //   timelapseEnabled: boolean,
  //   timelapseInterval: number | null,
  // ): Promise<number> {
  //   return (
  //     (
  //       await this.#connection("camera_settings").insert({
  //         name,
  //         xVideoResolution,
  //         yVideoResolution,
  //         videoFps,
  //         xImageResolution,
  //         yImageResolution,
  //         imageRetentionDays,
  //         imageRetentionSize,
  //         timelapseEnabled,
  //         timelapseInterval,
  //       })
  //     )[0] ?? -1
  //   );
  // }

  async updateCameraSettingsAsync(cameraSettings: SDBCameraSettings): Promise<void> {
    return this.#connection("camera_settings").where("id", cameraSettings.id).update({
      id: cameraSettings.id,
      enabled: cameraSettings.enabled,
      name: cameraSettings.name,
      xVideoResolution: cameraSettings.xVideoResolution,
      yVideoResolution: cameraSettings.yVideoResolution,
      videoFps: cameraSettings.videoFps,
      xImageResolution: cameraSettings.xImageResolution,
      yImageResolution: cameraSettings.yImageResolution,
      timelapseEnabled: cameraSettings.timelapseEnabled,
      imageRetentionDays: cameraSettings.imageRetentionDays,
      imageRetentionSize: cameraSettings.imageRetentionSize,
      timelapseInterval: cameraSettings.timelapseInterval,
      timelapseStartTime: cameraSettings.timelapseStartTime,
      timelapseEndTime: cameraSettings.timelapseEndTime,
    });
  }

  // async deleteCameraSettingsAsync(cameraId: number): Promise<void> {
  //   return this.#connection("camera_settings").where("id", cameraId).delete();
  // }

  async getUserAsync(username: string): Promise<SDBUser[]> {
    return this.#connection("users").where("username", username).select("*");
  }
  async addUserAsync(user: SDBUser): Promise<void> {
    return this.#connection("users").insert(user);
  }

  async getDatabaseSizeAsync(): Promise<number> {
    const result = await this.#connection.raw(
      "SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) AS size",
    );
    return this.#parseSizeValue(this.#getFirstRawRow(result)?.["size"]);
  }

  async backupDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    outputFile: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.#backupDatabaseArchiveAsync(host, port, user, password, outputFile, logger);
  }

  async swapRestoreDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    inputFile: string,
    logger: winston.Logger,
  ): Promise<void> {
    const dbName = this.#connection.client.database();
    const restoreDbName = `${dbName}-restore`;
    const oldDbName = `${dbName}-old`;

    let cleanupNeeded = false;

    try {
      await this.#dropDatabaseIfExistsAsync(host, port, user, password, oldDbName, logger);
      await this.#dropDatabaseIfExistsAsync(host, port, user, password, restoreDbName, logger);
      await this.#createDatabaseAsync(host, port, user, password, restoreDbName, logger);
      cleanupNeeded = true;

      await this.#restoreDatabaseArchiveAsync(
        host,
        port,
        user,
        password,
        inputFile,
        restoreDbName,
        logger,
      );

      await this.#terminateOtherConnectionsAsync(host, port, user, password, dbName, logger);
      await this.#renameDatabaseAsync(host, port, user, password, dbName, oldDbName, logger);
      await this.#renameDatabaseAsync(host, port, user, password, restoreDbName, dbName, logger);
    } catch (error) {
      if (cleanupNeeded) {
        try {
          await this.#dropDatabaseIfExistsAsync(host, port, user, password, restoreDbName, logger);
          await this.#dropDatabaseIfExistsAsync(host, port, user, password, oldDbName, logger);
          logger.warn(`Cleaned up orphaned databases after failed restore`);
        } catch (cleanupError) {
          logger.error(
            `Failed to clean up orphaned databases after restore error: ${(cleanupError as Error).message}`,
          );
        }
      }
      throw error;
    }
  }

  async deleteOldDatabaseAsync(logger: winston.Logger): Promise<void> {
    const dbName = this.#connection.client.database();
    const oldDbName = `${dbName}-old`;
    const host = process.env["DATABASE_HOST"]!;
    const port = parseInt(process.env["DATABASE_PORT"]!);
    const user = process.env["DATABASE_USER"]!;
    const password = process.env["DATABASE_PASSWORD"]!;

    try {
      await this.#dropDatabaseIfExistsAsync(host, port, user, password, oldDbName, logger);
      logger.info(`Deleted old database: ${oldDbName}`);
    } catch (err) {
      logger.error(`Failed to delete old database ${oldDbName}:`, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Raw data query endpoints (for client-side formatting, not Recharts consumption)
  // ---------------------------------------------------------------------------

  async querySensorDataAsync(request: SensorDataQueryRequest): Promise<SensorDataQueryResponse> {
    const tableName = SENSOR_AGGREGATE_TABLES[request.downsample ?? "5m"];
    if (tableName) {
      return this.#querySensorDataAggregateAsync(request, tableName);
    }
    // Unknown downsample interval — compute on-the-fly from raw data
    return this.#querySensorDataRawAsync(request, request.downsample ?? "5m");
  }

  async queryOutputDataAsync(request: OutputDataQueryRequest): Promise<OutputDataQueryResponse> {
    const tableName = OUTPUT_AGGREGATE_TABLES[request.downsample ?? "5m"];
    if (tableName) {
      return this.#queryOutputDataAggregateAsync(request, tableName);
    }
    // Unknown downsample interval — compute on-the-fly from raw data
    return this.#queryOutputDataRawAsync(request, request.downsample ?? "5m");
  }

  // ---------------------------------------------------------------------------
  // Sensor aggregate path — one query for all sensors
  // ---------------------------------------------------------------------------

  async #querySensorDataAggregateAsync(
    request: SensorDataQueryRequest,
    aggregateTableName: string,
  ): Promise<SensorDataQueryResponse> {
    const limit = Math.min(request.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const readingTypes = request.readingTypes;
    const whereRaw = this.#buildAggregateFilters(request, "sensor_id", readingTypes);

    const selectColumns: (string | Knex.Raw)[] = [
      "bucket",
      "sensor_id",
      "metric",
      "units",
      "sample_count",
      "average_data",
      "minimum_data",
      "maximum_data",
      "stddev_data",
      "first_data",
      "last_data",
      this.#connection.raw("approx_percentile(?, percentile_sketch) AS percentile_data", [
        request.percentile ?? 0.5,
      ]),
    ];

    return this.#queryDataAsync({
      tableName: aggregateTableName,
      selectColumns,
      whereRaw,
      limit,
      cursorColumn: "bucket",
      aggregates: [...(request.aggregates ?? DEFAULT_AGGREGATES)],
      formatRows: formatSensorAggregateRows,
    });
  }

  // ---------------------------------------------------------------------------
  // Output aggregate path — one query for all outputs
  // ---------------------------------------------------------------------------

  async #queryOutputDataAggregateAsync(
    request: OutputDataQueryRequest,
    aggregateTableName: string,
  ): Promise<OutputDataQueryResponse> {
    const limit = Math.min(request.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const whereRaw = this.#buildAggregateFilters(request, "output_id", undefined);

    const selectColumns: (string | Knex.Raw)[] = [
      "bucket",
      "output_id",
      "sample_count",
      "average_value",
      "minimum_value",
      "maximum_value",
      "stddev_value",
      "first_value",
      "last_value",
      this.#connection.raw("approx_percentile(?, percentile_sketch) AS percentile_value", [
        request.percentile ?? 0.5,
      ]),
    ];

    return this.#queryDataAsync({
      tableName: aggregateTableName,
      selectColumns,
      whereRaw,
      limit,
      cursorColumn: "bucket",
      aggregates: [...(request.aggregates ?? DEFAULT_AGGREGATES)],
      formatRows: formatOutputAggregateRows,
    });
  }

  // ---------------------------------------------------------------------------
  // Sensor raw path — computes time_bucket on-the-fly from raw hypertable
  // ---------------------------------------------------------------------------

  async #querySensorDataRawAsync(
    request: SensorDataQueryRequest,
    interval: string,
  ): Promise<SensorDataQueryResponse> {
    const limit = Math.min(request.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const readingTypes = request.readingTypes;
    const whereRaw = this.#buildRawFilters(request, "sensor_id", readingTypes);

    const query = buildSensorRawQuery(this.#connection, interval, whereRaw, limit);

    const result = await query;
    const rows = result as Array<Record<string, unknown>>;
    const hasMoreRows = rows.length > limit;
    const truncated = hasMoreRows ? rows.slice(0, limit) : rows;

    let nextCursor: string | undefined;
    if (hasMoreRows && truncated.length > 0) {
      const lastRow = truncated[truncated.length - 1]!;
      const bucketValue = lastRow["bucket"] as string | Date | null | undefined;
      nextCursor = Buffer.from(dbToIso(bucketValue) ?? String(bucketValue)).toString("base64");
    }

    return formatSensorAggregateRows(truncated, [...(request.aggregates ?? DEFAULT_AGGREGATES)], nextCursor);
  }

  // ---------------------------------------------------------------------------
  // Output raw path — computes time_bucket on-the-fly from raw hypertable
  // ---------------------------------------------------------------------------

  async #queryOutputDataRawAsync(
    request: OutputDataQueryRequest,
    interval: string,
  ): Promise<OutputDataQueryResponse> {
    const limit = Math.min(request.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const whereRaw = this.#buildRawFilters(request, "output_id", undefined);

    const query = buildOutputRawQuery(this.#connection, interval, whereRaw, limit);

    const result = await query;
    const rows = result as Array<Record<string, unknown>>;
    const hasMoreRows = rows.length > limit;
    const truncated = hasMoreRows ? rows.slice(0, limit) : rows;

    let nextCursor: string | undefined;
    if (hasMoreRows && truncated.length > 0) {
      const lastRow = truncated[truncated.length - 1]!;
      const bucketValue = lastRow["bucket"] as string | Date | null | undefined;
      nextCursor = Buffer.from(dbToIso(bucketValue) ?? String(bucketValue)).toString("base64");
    }

    return formatOutputAggregateRows(truncated, [...(request.aggregates ?? DEFAULT_AGGREGATES)], nextCursor);
  }

  // ---------------------------------------------------------------------------
  // Generic data query — shared logic for aggregate and raw paths
  // ---------------------------------------------------------------------------

  async #queryDataAsync<T>(config: DataQueryConfig<T>): Promise<T> {
    const query = this.#connection(config.tableName)
      .select(...config.selectColumns)
      .where(config.whereRaw);

    if (config.groupByRaw) {
      query.groupByRaw(config.groupByRaw, ...((config.groupByValues as Knex.RawBinding[]) ?? []));
    }

    query.orderBy(config.cursorColumn, "DESC").limit(config.limit + 1);

    const result = await query;
    const rows = result as Array<Record<string, unknown>>;
    const hasMoreRows = rows.length > config.limit;
    const truncated = hasMoreRows ? rows.slice(0, config.limit) : rows;

    let nextCursor: string | undefined;
    if (hasMoreRows && truncated.length > 0) {
      const lastRow = truncated[truncated.length - 1]!;
      const bucketValue = lastRow[config.cursorColumn] as string | Date | null | undefined;
      nextCursor = Buffer.from(dbToIso(bucketValue) ?? String(bucketValue)).toString("base64");
    }

    return config.formatRows(truncated, config.aggregates, nextCursor);
  }

  // ---------------------------------------------------------------------------
  // Metadata helpers
  // ---------------------------------------------------------------------------

  #buildAggregateFilters(
    request: SensorDataQueryRequest | OutputDataQueryRequest,
    idColumnName: "sensor_id" | "output_id",
    readingTypes: string[] | undefined,
  ) {
    const cursor = this.#parseCursor(request.cursor);
    const { start, end } = request.timeRange;
    const ids = request.ids;

    const timeFilter = cursor
      ? this.#connection.raw('"bucket" > ?', [cursor])
      : this.#connection.raw('"bucket" BETWEEN ? AND ?', [start, end]);

    const idFilter =
      ids && ids.length > 0
        ? this.#connection.raw(`"${idColumnName}" IN (${ids.map(() => "?").join(", ")})`, ids)
        : this.#connection.raw("1=1");

    const metricFilter =
      readingTypes && readingTypes.length > 0
        ? this.#connection.raw(
            '"metric" IN (' + readingTypes.map(() => "?").join(", ") + ")",
            readingTypes,
          )
        : this.#connection.raw("1=1");

    return this.#connection.raw("? AND ? AND ?", [timeFilter, idFilter, metricFilter]);
  }

  #buildRawFilters(
    request: SensorDataQueryRequest | OutputDataQueryRequest,
    idColumnName: "sensor_id" | "output_id",
    readingTypes: string[] | undefined,
  ) {
    const cursor = this.#parseCursor(request.cursor);
    const { start, end } = request.timeRange;
    const ids = (request as any).ids;

    const timeFilter = cursor
      ? this.#connection.raw('"logTime" > ?', [cursor])
      : this.#connection.raw('"logTime" BETWEEN ? AND ?', [start, end]);

    const idFilter =
      ids && ids.length > 0
        ? this.#connection.raw(`"${idColumnName}" IN (${ids.map(() => "?").join(", ")})`, ids)
        : this.#connection.raw("1=1");

    const metricFilter =
      readingTypes && readingTypes.length > 0
        ? this.#connection.raw(
            '"metric" IN (' + readingTypes.map(() => "?").join(", ") + ")",
            readingTypes,
          )
        : this.#connection.raw("1=1");

    return this.#connection.raw("? AND ? AND ?", [timeFilter, idFilter, metricFilter]);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#connection.destroy();
  }

  #parseCursor(cursor: string | undefined): Date | undefined {
    if (!cursor) return undefined;
    try {
      const decoded = Buffer.from(cursor, "base64").toString();
      const date = new Date(decoded);
      if (isNaN(date.getTime())) {
        throw new InvalidCursorError(`Invalid cursor timestamp: ${decoded}`);
      }
      return date;
    } catch {
      throw new InvalidCursorError(`Invalid cursor: must be base64-encoded ISO 8601 timestamp`);
    }
  }

  async #insertAndGetIdAsync(tableName: string, values: Record<string, unknown>): Promise<number> {
    const result = await this.#connection(tableName)
      .insert(values)
      .returning<{ id: number }[]>("id");
    if (!result[0]?.id) {
      throw new Error(`Insert into "${tableName}" returned no id`);
    }
    return result[0].id;
  }

  #getCurrentTimestampValue(): Date {
    return new Date();
  }

  #normalizeReadings(readings: SDBReading[], toIsoString: boolean): SDBReading[] {
    return readings.map((reading) => ({
      ...reading,
      logTime: this.#normalizeLogTime(reading.logTime, toIsoString),
    }));
  }

  #normalizeOutputStates(states: SDBOutputState[], toIsoString: boolean): SDBOutputState[] {
    return states.map((state) => ({
      ...state,
      logTime: this.#normalizeLogTime(state.logTime, toIsoString),
    }));
  }

  #normalizeSensors(sensors: SDBSensor[]): SDBSensor[] {
    return sensors.map((sensor) => ({
      ...sensor,
      lowCalibrationPoint: this.#normalizeNullableNumber(sensor.lowCalibrationPoint),
      highCalibrationPoint: this.#normalizeNullableNumber(sensor.highCalibrationPoint),
    }));
  }

  #normalizeLogTime(value: string | Date | null | undefined, toIsoString: boolean): string {
    const isoValue = dbToIso(value);
    if (!isoValue) {
      return "";
    }

    if (toIsoString || value instanceof Date) {
      return isoValue;
    }

    return typeof value === "string" ? value : isoValue;
  }

  #mergeSensorChartReadings(baseRows: SDBReading[], tailRows: SDBReading[]): SDBReading[] {
    const mergedRows = new Map<string, SDBReading>();
    for (const row of baseRows) {
      mergedRows.set(`${row.metric}:${dbToIso(row.logTime) ?? row.logTime}`, row);
    }
    for (const row of tailRows) {
      mergedRows.set(`${row.metric}:${dbToIso(row.logTime) ?? row.logTime}`, row);
    }

    return [...mergedRows.values()].sort((left, right) => {
      const timeDifference = new Date(left.logTime).getTime() - new Date(right.logTime).getTime();
      if (timeDifference !== 0) {
        return timeDifference;
      }

      return left.metric.localeCompare(right.metric);
    });
  }

  #mergeOutputChartStates(
    baseRows: SDBOutputState[],
    tailRows: SDBOutputState[],
  ): SDBOutputState[] {
    const mergedRows = new Map<string, SDBOutputState>();
    for (const row of baseRows) {
      mergedRows.set(dbToIso(row.logTime) ?? String(row.logTime), row);
    }
    for (const row of tailRows) {
      mergedRows.set(dbToIso(row.logTime) ?? String(row.logTime), row);
    }

    return [...mergedRows.values()].sort(
      (left, right) => new Date(left.logTime).getTime() - new Date(right.logTime).getTime(),
    );
  }

  #getRawRows<T>(result: unknown): T[] {
    return Array.isArray((result as { rows?: T[] })?.rows) ? (result as { rows: T[] }).rows : [];
  }

  #getFirstRawRow(result: any): Record<string, unknown> | undefined {
    return Array.isArray(result?.rows)
      ? (result.rows[0] as Record<string, unknown> | undefined)
      : undefined;
  }

  #parseSizeValue(value: unknown): number {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      return parseFloat(value);
    }

    return 0;
  }

  #normalizeNullableNumber(value: unknown): number | null {
    if (value == null) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "bigint") {
      return Number(value);
    }

    const normalizedValue = Number(value);
    return Number.isFinite(normalizedValue) ? normalizedValue : null;
  }

  async #psqlWithParamsAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    sqlTemplate: string,
    params: Record<string, string>,
    logger: winston.Logger,
    targetDatabase?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const psqlInput =
        Object.entries(params)
          .map(([name, value]) => `\\set ${name} '${value}'`)
          .join("\n") +
        "\n" +
        sqlTemplate;

      const psql = spawn(
        "psql",
        [
          `--host=${host}`,
          `--port=${port}`,
          `--username=${user}`,
          targetDatabase ? `--dbname=${targetDatabase}` : "--dbname=postgres",
          "--set=ON_ERROR_STOP=on",
          "--no-psqlrc",
          "-f",
          "-",
        ],
        {
          env: {
            ...process.env,
            PGPASSWORD: password,
            LANG: process.env["LANG"] ?? "C.UTF-8",
            LC_ALL: process.env["LC_ALL"] ?? "C.UTF-8",
            LANGUAGE: process.env["LANGUAGE"] ?? "C.UTF-8",
          },
        },
      );

      let stderrChunks: string[] = [];
      psql.stderr.on("data", (d) => {
        const chunk = d.toString();
        stderrChunks.push(chunk);
        logger.debug("psql:", chunk);
      });

      psql.on("error", (err) => reject(err));

      psql.stdin.write(psqlInput);
      psql.stdin.end();

      psql.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(this.#buildRestoreErrorMessage(code, stderrChunks.join(""), "psql")));
        } else {
          resolve();
        }
      });
    });
  }

  async #backupDatabaseArchiveAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    outputFile: string,
    logger: winston.Logger,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stderrChunks: string[] = [];
      const dump = spawn(
        "pg_dump",
        [
          `--host=${host}`,
          `--port=${port}`,
          `--username=${user}`,
          "--format=custom",
          "--compress=9",
          "--no-owner",
          "--no-privileges",
          this.#connection.client.database(),
        ],
        {
          env: {
            ...process.env,
            PGPASSWORD: password,
            LANG: process.env["LANG"] ?? "C.UTF-8",
            LC_ALL: process.env["LC_ALL"] ?? "C.UTF-8",
            LANGUAGE: process.env["LANGUAGE"] ?? "C.UTF-8",
          },
        },
      );
      const out = fs.createWriteStream(outputFile, { flags: "w" });

      dump.stdout.pipe(out);

      dump.stderr.on("data", (d) => {
        const chunk = d.toString();
        stderrChunks.push(chunk);
        logger.debug("pg_dump:", chunk);
      });

      dump.on("error", (err) => reject(err));
      out.on("error", (err) => reject(err));

      dump.on("exit", (code) => {
        if (code !== 0) {
          return reject(
            new Error(this.#buildRestoreErrorMessage(code, stderrChunks.join(""), "pg_dump")),
          );
        }
        out.end();
      });

      out.on("close", () => resolve());
    });
  }

  async #restoreDatabaseArchiveAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    inputFile: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    await this.#runTimescaleHookAsync(
      host,
      port,
      user,
      password,
      databaseName,
      "timescaledb_pre_restore",
      logger,
    );
    await this.#restoreViaPgRestoreAsync(
      host,
      port,
      user,
      password,
      inputFile,
      databaseName,
      logger,
    );
    await this.#runTimescaleHookAsync(
      host,
      port,
      user,
      password,
      databaseName,
      "timescaledb_post_restore",
      logger,
    );
  }

  async #runTimescaleHookAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    databaseName: string,
    functionName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.#psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `SELECT :"functionName"();`,
      { functionName },
      logger,
      databaseName,
    );
  }

  async #restoreViaPgRestoreAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    archiveFile: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const pgRestore = spawn(
        "pg_restore",
        [
          `--host=${host}`,
          `--port=${port}`,
          `--username=${user}`,
          `--dbname=${databaseName}`,
          "--clean",
          "--if-exists",
          "--single-transaction",
          "--exit-on-error",
        ],
        {
          env: {
            ...process.env,
            PGPASSWORD: password,
            LANG: process.env["LANG"] ?? "C.UTF-8",
            LC_ALL: process.env["LC_ALL"] ?? "C.UTF-8",
            LANGUAGE: process.env["LANGUAGE"] ?? "C.UTF-8",
          },
        },
      );

      const archiveStream = fs.createReadStream(archiveFile);
      archiveStream.pipe(pgRestore.stdin);

      let stderrChunks: string[] = [];
      pgRestore.stderr.on("data", (d) => {
        const chunk = d.toString();
        stderrChunks.push(chunk);
        logger.debug("pg_restore:", chunk);
      });

      archiveStream.on("error", (err) => reject(err));
      pgRestore.on("error", (err) => reject(err));

      pgRestore.on("exit", (code) => {
        if (code !== 0) {
          reject(
            new Error(this.#buildRestoreErrorMessage(code, stderrChunks.join(""), "pg_restore")),
          );
        } else {
          resolve();
        }
      });
    });
  }

  #buildRestoreErrorMessage(
    exitCode: number | null,
    stderrOutput: string,
    toolName: "pg_dump" | "pg_restore" | "psql",
  ): string {
    const normalizedStderr = stderrOutput.trim();
    if (normalizedStderr.includes("server version mismatch")) {
      return [
        `${toolName} exited with ${exitCode ?? "unknown"}.`,
        "PostgreSQL backup/restore requires client tools that match the server major version.",
        "Install a PostgreSQL 18 client or run backups from an environment that provides a matching binary.",
        normalizedStderr,
      ].join(" ");
    }

    if (normalizedStderr.length > 0) {
      return `${toolName} exited with ${exitCode ?? "unknown"}: ${normalizedStderr}`;
    }

    return `${toolName} exited with ${exitCode ?? "unknown"}`;
  }

  async #dropDatabaseIfExistsAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.#psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `DROP DATABASE IF EXISTS :"databaseName";`,
      { databaseName },
      logger,
    );
  }

  async #terminateOtherConnectionsAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.#psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :'databaseName' AND pid <> pg_backend_pid();`,
      { databaseName },
      logger,
    );
  }

  async #renameDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    fromName: string,
    toName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.#psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `ALTER DATABASE :"fromName" RENAME TO :"toName";`,
      { fromName, toName },
      logger,
    );
  }

  async #createDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    databaseName: string,
    logger: winston.Logger,
  ): Promise<void> {
    return this.#psqlWithParamsAsync(
      host,
      port,
      user,
      password,
      `CREATE DATABASE :"databaseName";`,
      { databaseName },
      logger,
    );
  }
}

export class InvalidCursorError extends Error {
  constructor(message: string) {
    super(message);
  }
}
