import { IWeekdayCondition } from "@sproot/automation/IWeekdayCondition";
import { evaluateWeekday } from "./ConditionUtils";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes";

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
