/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBDateRangeCondition } from "@sproot/common/src/database/SDBDateRangeCondition";
import { ConditionGroupType } from "@sproot/common/src/automation/ConditionTypes";
import { IDateRangeCondition } from "../../../automation/IDateRangeCondition";
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
