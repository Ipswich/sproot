/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBWeekdayCondition } from "../../SDBWeekdayCondition";
import { ConditionGroupType } from "../../../automation/ConditionTypes";
import { IWeekdayCondition } from "../../../automation/IWeekdayCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface IWeekdayConditionsRepository extends IBaseConditionsRepository<SDBWeekdayCondition> {
  addAsync(automationId: number, groupType: ConditionGroupType, weekdays: number): Promise<number>;
  updateAsync(automationId: number, condition: IWeekdayCondition): Promise<void>;
}
