import { SDBOutputCondition } from "@sproot/common/database/SDBOutputCondition";
import { ConditionGroupType, ConditionOperator } from "@sproot/common/automation/ConditionTypes";
import { IOutputCondition } from "@sproot/common/automation/IOutputCondition";
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
  getMostRecentViolationAsync(
    outputId: number,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number,
    now?: Date,
  ): Promise<Date | null>;
}
