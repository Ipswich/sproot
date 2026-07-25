/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBMonthCondition } from "@sproot/common/src/database/SDBMonthCondition";
import { ConditionGroupType } from "@sproot/common/src/automation/ConditionTypes";
import { IMonthCondition } from "../../../automation/IMonthCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface IMonthConditionsRepository extends IBaseConditionsRepository<SDBMonthCondition> {
  addAsync(automationId: number, groupType: ConditionGroupType, months: number): Promise<number>;
  updateAsync(automationId: number, condition: IMonthCondition): Promise<void>;
}
