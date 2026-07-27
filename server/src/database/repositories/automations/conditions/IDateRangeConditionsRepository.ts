import { SDBDateRangeCondition } from "@sproot/common/database/SDBDateRangeCondition";
import { ConditionGroupType } from "@sproot/common/automation/ConditionTypes";
import { IDateRangeCondition } from "@sproot/common/automation/IDateRangeCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface IDateRangeConditionsRepository extends IBaseConditionsRepository<SDBDateRangeCondition> {
  addAsync(
    automationId: number,
    groupType: ConditionGroupType,
    startMonth: number,
    startDate: number,
    endMonth: number,
    endDate: number,
  ): Promise<number>;
  updateAsync(automationId: number, condition: IDateRangeCondition): Promise<void>;
}
