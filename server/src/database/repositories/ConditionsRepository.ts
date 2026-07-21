import { IDateRangeCondition } from "@sproot/sproot-common/dist/automation/IDateRangeCondition";
import { IMonthCondition } from "@sproot/sproot-common/dist/automation/IMonthCondition";
import { IOutputCondition } from "@sproot/sproot-common/dist/automation/IOutputCondition";
import { ISensorCondition } from "@sproot/sproot-common/dist/automation/ISensorCondition";
import { ITimeCondition } from "@sproot/sproot-common/dist/automation/ITimeCondition";
import { IWeekdayCondition } from "@sproot/sproot-common/dist/automation/IWeekdayCondition";
import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/sproot-common/dist/automation/ConditionTypes";
import { SDBDateRangeCondition } from "@sproot/sproot-common/dist/database/SDBDateRangeCondition";
import { IConditionsRepository } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBMonthCondition } from "@sproot/sproot-common/dist/database/SDBMonthCondition";
import { SDBOutputCondition } from "@sproot/sproot-common/dist/database/SDBOutputCondition";
import { SDBSensorCondition } from "@sproot/sproot-common/dist/database/SDBSensorCondition";
import { SDBTimeCondition } from "@sproot/sproot-common/dist/database/SDBTimeCondition";
import { SDBWeekdayCondition } from "@sproot/sproot-common/dist/database/SDBWeekdayCondition";
import { Knex } from "knex";
import { BaseKnexRepository } from "./BaseKnexRepository";

export class ConditionsRepository extends BaseKnexRepository implements IConditionsRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getSensorConditionsAsync(automationId: number): Promise<SDBSensorCondition[]> {
    return this.connection("sensor_conditions as sc")
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
      .where("automation_id", automationId)
      .orderBy("sc.id", "asc");
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
    return this.insertAndGetIdAsync("sensor_conditions", {
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
    return this.connection("sensor_conditions")
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
    return this.connection("sensor_conditions").where("id", conditionId).delete();
  }

  async getOutputConditionsAsync(automationId: number): Promise<SDBOutputCondition[]> {
    return this.connection("output_conditions as oc")
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
      .where("automation_id", automationId)
      .orderBy("oc.id", "asc");
  }

  async addOutputConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    outputId: number,
  ): Promise<number> {
    return this.insertAndGetIdAsync("output_conditions", {
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
    return this.connection("output_conditions")
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
    return this.connection("output_conditions").where("id", conditionId).delete();
  }

  async getTimeConditionsAsync(automationId: number): Promise<SDBTimeCondition[]> {
    return this.connection("time_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "startTime", "endTime"])
      .orderBy("id", "asc");
  }

  async addTimeConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    endTime: string | undefined | null,
  ): Promise<number> {
    return this.insertAndGetIdAsync("time_conditions", {
      automation_id: automationId,
      groupType: type,
      startTime,
      endTime,
    });
  }

  async updateTimeConditionAsync(automationId: number, condition: ITimeCondition): Promise<void> {
    return this.connection("time_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        startTime: condition.startTime,
        endTime: condition.endTime,
      });
  }

  async deleteTimeConditionAsync(conditionId: number): Promise<void> {
    return this.connection("time_conditions").where("id", conditionId).delete();
  }

  async getWeekdayConditionsAsync(automationId: number): Promise<SDBWeekdayCondition[]> {
    return this.connection("weekday_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "weekdays"])
      .orderBy("id", "asc");
  }

  async addWeekdayConditionAsync(
    automationId: number,
    groupType: ConditionGroupType,
    weekdays: number,
  ): Promise<number> {
    return this.insertAndGetIdAsync("weekday_conditions", {
      automation_id: automationId,
      groupType,
      weekdays,
    });
  }

  async updateWeekdayConditionAsync(
    automationId: number,
    condition: IWeekdayCondition,
  ): Promise<void> {
    return this.connection("weekday_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        weekdays: condition.weekdays,
      });
  }

  async deleteWeekdayConditionAsync(conditionId: number): Promise<void> {
    return this.connection("weekday_conditions").where("id", conditionId).delete();
  }

  async getMonthConditionsAsync(automationId: number): Promise<SDBMonthCondition[]> {
    return this.connection("month_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "months"])
      .orderBy("id", "asc");
  }

  async addMonthConditionAsync(
    automationId: number,
    groupType: ConditionGroupType,
    months: number,
  ): Promise<number> {
    return this.insertAndGetIdAsync("month_conditions", {
      automation_id: automationId,
      groupType,
      months,
    });
  }

  async updateMonthConditionAsync(automationId: number, condition: IMonthCondition): Promise<void> {
    return this.connection("month_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        months: condition.months,
      });
  }

  async deleteMonthConditionAsync(conditionId: number): Promise<void> {
    return this.connection("month_conditions").where("id", conditionId).delete();
  }

  async getDateRangeConditionsAsync(automationId: number): Promise<SDBDateRangeCondition[]> {
    return this.connection("date_range_conditions")
      .where("automation_id", automationId)
      .select([
        "id",
        "automation_id as automationId",
        "groupType",
        "startMonth",
        "startDate",
        "endMonth",
        "endDate",
      ])
      .orderBy("id", "asc");
  }

  async addDateRangeConditionAsync(
    automationId: number,
    groupType: ConditionGroupType,
    startMonth: number,
    startDate: number,
    endMonth: number,
    endDate: number,
  ): Promise<number> {
    return this.insertAndGetIdAsync("date_range_conditions", {
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
    return this.connection("date_range_conditions")
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
    return this.connection("date_range_conditions").where("id", conditionId).delete();
  }
}