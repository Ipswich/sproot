import { ConditionGroupType, ConditionOperator } from "@sproot/common/automation/ConditionTypes";
import { ISensorCondition } from "@sproot/common/automation/ISensorCondition";
import type { ISensorConditionsRepository } from "./ISensorConditionsRepository";
import { SDBSensorCondition } from "@sproot/common/database/SDBSensorCondition";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { Knex } from "knex";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";

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

  async deleteAsync(conditionId: number): Promise<void> {
    return this.connection("sensor_conditions").where("id", conditionId).delete();
  }
}
