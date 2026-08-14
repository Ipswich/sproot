import { SDBSensorCondition } from "@sproot/common/database/SDBSensorCondition";
import { ConditionGroupType, ConditionOperator } from "@sproot/common/automation/ConditionTypes";
import { ISensorCondition } from "@sproot/common/automation/ISensorCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface ISensorConditionsRepository extends IBaseConditionsRepository<SDBSensorCondition> {
  addAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    sensorId: number,
    readingType: string,
  ): Promise<number>;
  updateAsync(automationId: number, condition: ISensorCondition): Promise<void>;
  getMostRecentViolationAsync(
    sensorId: number,
    readingType: string,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number,
    now?: Date,
  ): Promise<Date | null>;
}
