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
  isPostgresClient,
  normalizeDatabaseClient,
  type SupportedDatabaseClient,
} from "./DatabaseClient";

export class SprootDB implements ISprootDB {
  #connection: Knex;

  constructor(connection: Knex) {
    this.#connection = connection;
  }

  async getSensorsAsync(): Promise<SDBSensor[]> {
    return this.#connection("sensors").select("*", "subcontroller_id as subcontrollerId");
  }
  async getSensorAsync(id: number): Promise<SDBSensor[]> {
    return this.#connection("sensors")
      .select("*", "subcontroller_id as subcontrollerId")
      .where("id", id);
  }
  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    return this.#connection("sensors as s")
      .leftJoin("subcontrollers as ed", "s.subcontroller_id", "ed.id")
      .select("s.*", "subcontroller_id as subcontrollerId", "ed.hostName")
      .whereIn("s.model", ["DS18B20", "ESP32_DS18B20"]);
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
          logTime: toDbDate(),
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
      .where("d.logTime", ">", this.#getLookbackDate(since, minutes))
      .andWhere("d.sensor_id", sensor.id)
      .orderBy("d.logTime", "asc");

    if (toIsoString) {
      for (const reading of readings) {
        reading.logTime = dbToIso(reading.logTime)!;
      }
    }
    return readings;
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
      logTime: toDbDate(),
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
      lastStateUpdate: toDbDate(),
    });
  }
  async getLastOutputStateAsync(outputId: number): Promise<SDBOutputState[]> {
    return this.#connection("outputs")
      .where("id", outputId)
      .select("lastControlMode as controlMode", "lastValue as value", "lastStateUpdate as logTime");
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
      .where("d.logTime", ">", this.#getLookbackDate(since, minutes))
      .andWhere("d.output_id", output.id)
      .orderBy("d.logTime", "asc");

    if (toIsoString) {
      for (const state of states) {
        state.logTime = dbToIso(state.logTime)!;
      }
    }
    return states;
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
    if (isPostgresClient(this.#getDatabaseClient())) {
      const result = await this.#connection.raw(
        "SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) AS size",
      );
      return this.#parseSizeValue(this.#getFirstRawRow(result)?.["size"]);
    }

    const result = await this.#connection.raw(
      "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size FROM information_schema.tables WHERE table_schema = ?",
      [this.#connection.client.database()],
    );
    return this.#parseSizeValue(this.#getFirstRawRow(result)?.["size"]);
  }

  async backupDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    outputFile: string,
  ): Promise<void> {
    if (isPostgresClient(this.#getDatabaseClient())) {
      return this.#backupPostgresDatabaseAsync(host, port, user, password, outputFile);
    }

    return new Promise((resolve, reject) => {
      const dump = spawn("mysqldump", [
        `--host=${host}`,
        `--port=${port}`,
        `--user=${user}`,
        `--password=${password}`,
        "--single-transaction",
        "--quick",
        this.#connection.client.database(),
      ]);

      const gzip = spawn("gzip", ["-c"]); // -c = write compressed to stdout

      const out = fs.createWriteStream(outputFile, { flags: "w" });

      dump.stdout.pipe(gzip.stdin);
      gzip.stdout.pipe(out);

      dump.stderr.on("data", (d) => console.error("mysqldump:", d.toString()));
      gzip.stderr.on("data", (d) => console.error("gzip:", d.toString()));

      dump.on("exit", (code) => {
        if (code !== 0) return reject(new Error(`mysqldump exited with ${code}`));
      });

      gzip.on("exit", (code) => {
        if (code !== 0) return reject(new Error(`gzip exited with ${code}`));
      });

      out.on("close", () => resolve());
    });
  }

  async restoreDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    inputFile: string,
  ): Promise<void> {
    const dbName = this.#connection.client.database();

    if (isPostgresClient(this.#getDatabaseClient())) {
      return this.#restorePostgresDatabaseAsync(host, port, user, password, inputFile, dbName);
    }

    await new Promise<void>((resolve, reject) => {
      const gunzip = spawn("gunzip", ["-c", inputFile]); // write decompressed SQL to stdout
      const mysql = spawn("mysql", [
        `--host=${host}`,
        `--port=${port}`,
        `--user=${user}`,
        `--password=${password}`,
        dbName,
      ]);

      gunzip.stdout.pipe(mysql.stdin);

      gunzip.stderr.on("data", (d) => console.error("gunzip:", d.toString()));
      mysql.stderr.on("data", (d) => console.error("mysql:", d.toString()));

      gunzip.on("error", (err) => reject(err));
      mysql.on("error", (err) => reject(err));

      gunzip.on("exit", (code) => {
        if (code !== 0) return reject(new Error(`gunzip exited with ${code}`));
      });

      mysql.on("exit", (code) => {
        if (code !== 0) return reject(new Error(`mysql exited with ${code}`));
        resolve();
      });
    });
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#connection.destroy();
  }

  #getDatabaseClient(): SupportedDatabaseClient {
    return normalizeDatabaseClient(this.#connection.client.config.client);
  }

  async #insertAndGetIdAsync(tableName: string, values: Record<string, unknown>): Promise<number> {
    if (isPostgresClient(this.#getDatabaseClient())) {
      const result = await this.#connection(tableName)
        .insert(values)
        .returning<{ id: number }[]>("id");
      return result[0]?.id ?? -1;
    }

    const result = await this.#connection(tableName).insert(values);
    return typeof result[0] === "number" ? result[0] : Number(result[0] ?? -1);
  }

  #getLookbackDate(since: Date, minutes: number): string {
    return toDbDate(new Date(since.getTime() - minutes * 60_000));
  }

  #getFirstRawRow(result: any): Record<string, unknown> | undefined {
    if (Array.isArray(result?.rows)) {
      return result.rows[0] as Record<string, unknown> | undefined;
    }

    if (Array.isArray(result?.[0])) {
      return result[0][0] as Record<string, unknown> | undefined;
    }

    return undefined;
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

  async #backupPostgresDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    outputFile: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const dump = spawn(
        "pg_dump",
        [
          `--host=${host}`,
          `--port=${port}`,
          `--username=${user}`,
          "--format=plain",
          "--no-owner",
          "--no-privileges",
          this.#connection.client.database(),
        ],
        {
          env: { ...process.env, PGPASSWORD: password },
        },
      );
      const gzip = spawn("gzip", ["-c"]);
      const out = fs.createWriteStream(outputFile, { flags: "w" });

      dump.stdout.pipe(gzip.stdin);
      gzip.stdout.pipe(out);

      dump.stderr.on("data", (d) => console.error("pg_dump:", d.toString()));
      gzip.stderr.on("data", (d) => console.error("gzip:", d.toString()));

      dump.on("exit", (code) => {
        if (code !== 0) return reject(new Error(`pg_dump exited with ${code}`));
      });

      gzip.on("exit", (code) => {
        if (code !== 0) return reject(new Error(`gzip exited with ${code}`));
      });

      out.on("close", () => resolve());
    });
  }

  async #restorePostgresDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    inputFile: string,
    databaseName: string,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const gunzip = spawn("gunzip", ["-c", inputFile]);
      const psql = spawn(
        "psql",
        [
          `--host=${host}`,
          `--port=${port}`,
          `--username=${user}`,
          `--dbname=${databaseName}`,
          "--single-transaction",
          "--set=ON_ERROR_STOP=on",
        ],
        {
          env: { ...process.env, PGPASSWORD: password },
        },
      );

      gunzip.stdout.pipe(psql.stdin);

      gunzip.stderr.on("data", (d) => console.error("gunzip:", d.toString()));
      psql.stderr.on("data", (d) => console.error("psql:", d.toString()));

      gunzip.on("error", (err) => reject(err));
      psql.on("error", (err) => reject(err));

      gunzip.on("exit", (code) => {
        if (code !== 0) return reject(new Error(`gunzip exited with ${code}`));
      });

      psql.on("exit", (code) => {
        if (code !== 0) return reject(new Error(`psql exited with ${code}`));
        resolve();
      });
    });
  }
}
