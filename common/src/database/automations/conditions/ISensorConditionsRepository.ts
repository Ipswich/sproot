/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBSensorCondition } from "@sproot/common/src/database/SDBSensorCondition";
import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/common/src/automation/ConditionTypes";
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
