/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBOutputCondition } from "../../SDBOutputCondition";
import { ConditionGroupType, ConditionOperator } from "../../../automation/ConditionTypes";
import { IOutputCondition } from "../../../automation/IOutputCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface IOutputConditionsRepository extends IBaseConditionsRepository<SDBOutputCondition> {
  addAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    outputId: number,
  ): Promise<number>;
  updateAsync(automationId: number, condition: IOutputCondition): Promise<void>;
}
