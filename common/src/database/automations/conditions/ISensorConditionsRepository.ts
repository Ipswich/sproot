/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBSensorCondition } from "../../SDBSensorCondition";
import { ConditionGroupType, ConditionOperator } from "../../../automation/ConditionTypes";
import { ISensorCondition } from "../../../automation/ISensorCondition";
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
}
