import { SDBMonthCondition } from "@sproot/common/database/SDBMonthCondition";
import { ConditionGroupType } from "@sproot/common/automation/ConditionTypes";
import { IMonthCondition } from "@sproot/common/automation/IMonthCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface IMonthConditionsRepository extends IBaseConditionsRepository<SDBMonthCondition> {
  addAsync(automationId: number, groupType: ConditionGroupType, months: number): Promise<number>;
  updateAsync(automationId: number, condition: IMonthCondition): Promise<void>;
}
