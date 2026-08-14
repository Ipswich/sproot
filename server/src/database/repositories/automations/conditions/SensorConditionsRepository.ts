import { ConditionGroupType, ConditionOperator } from "@sproot/common/automation/ConditionTypes";
import { ISensorCondition } from "@sproot/common/automation/ISensorCondition";
import type { ISensorConditionsRepository } from "./ISensorConditionsRepository";
import { SDBSensorCondition } from "@sproot/common/database/SDBSensorCondition";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { Knex } from "knex";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";
import { getLookbackDate } from "../../../databaseQueryUtils";

export class SensorConditionsRepository
  extends BaseKnexRepository
  implements ISensorConditionsRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getAsync(automationId: number): Promise<SDBSensorCondition[]> {
    return this.connection("sensor_conditions as sc")
      .select([
        "sc.id",
        "sc.automation_id as automationId",
        "sc.groupType",
        "sc.operator",
        "sc.comparisonValue",
        "sc.comparisonLookback",
        "sc.sensor_id as sensorId",
        "s.name as sensorName",
        "sc.readingType as readingType",
      ])
      .innerJoin("sensors as s", "sc.sensor_id", "s.id")
      .where("automation_id", automationId)
      .orderBy("sc.id", "asc");
  }

  async addAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    sensorId: number,
    readingType: ReadingType,
  ): Promise<number> {
    return this.insertAndGetIdAsync("sensor_conditions", {
      automation_id: automationId,
      groupType: type,
      operator,
      comparisonValue,
      comparisonLookback,
      sensor_id: sensorId,
      readingType: readingType,
    });
  }

  async updateAsync(automationId: number, condition: ISensorCondition): Promise<void> {
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

  async getMostRecentViolationAsync(
    sensorId: number,
    readingType: ReadingType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number,
    now: Date = new Date(),
  ): Promise<Date | null> {
    const violationPredicate = buildViolationPredicate("CAST(d.data AS DOUBLE PRECISION)", operator);
    const row = await this.connection("sensor_data as d")
      .select("d.logTime")
      .where("d.sensor_id", sensorId)
      .andWhere("d.metric", readingType)
      .andWhere("d.logTime", ">", getLookbackDate(now, comparisonLookback))
      .andWhereRaw(violationPredicate, [comparisonValue])
      .orderBy("d.logTime", "desc")
      .first();

    return row?.logTime != null ? new Date(row.logTime) : null;
  }

  async deleteAsync(conditionId: number): Promise<void> {
    return this.connection("sensor_conditions").where("id", conditionId).delete();
  }
}

function buildViolationPredicate(valueExpression: string, operator: ConditionOperator): string {
  switch (operator) {
    case "equal":
      return `${valueExpression} <> ?`;
    case "notEqual":
      return `${valueExpression} = ?`;
    case "greater":
      return `${valueExpression} <= ?`;
    case "greaterOrEqual":
      return `${valueExpression} < ?`;
    case "less":
      return `${valueExpression} >= ?`;
    case "lessOrEqual":
      return `${valueExpression} > ?`;
  }
}
