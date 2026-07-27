import { SDBWeekdayCondition } from "@sproot/common/database/SDBWeekdayCondition";
import { ConditionGroupType } from "@sproot/common/automation/ConditionTypes";
import { IWeekdayCondition } from "@sproot/common/automation/IWeekdayCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface IWeekdayConditionsRepository extends IBaseConditionsRepository<SDBWeekdayCondition> {
  addAsync(automationId: number, groupType: ConditionGroupType, weekdays: number): Promise<number>;
  updateAsync(automationId: number, condition: IWeekdayCondition): Promise<void>;
}
