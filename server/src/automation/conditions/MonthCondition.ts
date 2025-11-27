import { IMonthCondition } from "@sproot/automation/IMonthCondition";
import { evaluateMonth } from "./ConditionUtils";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes";

export class MonthCondition implements IMonthCondition {
  id: number;
  groupType: ConditionGroupType;
  months: number;
  constructor(id: number, groupType: ConditionGroupType, months: number) {
    this.id = id;
    this.groupType = groupType;
    this.months = months;
  }

  evaluate(now: Date): boolean {
    return evaluateMonth(now, this.months);
  }
}
