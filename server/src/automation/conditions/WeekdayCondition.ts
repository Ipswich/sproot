import { IWeekdayCondition } from "@sproot/automation/IWeekdayCondition.js";
import { evaluateWeekday } from "./ConditionUtils.js";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes.js";

export class WeekdayCondition implements IWeekdayCondition {
  id: number;
  groupType: ConditionGroupType;
  weekdays: number;
  constructor(id: number, groupType: ConditionGroupType, weekdays: number) {
    this.id = id;
    this.groupType = groupType;
    this.weekdays = weekdays;
  }

  evaluate(now: Date): boolean {
    return evaluateWeekday(now, this.weekdays);
  }
}
