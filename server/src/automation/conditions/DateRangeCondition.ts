import { IDateRangeCondition } from "@sproot/automation/IDateRangeCondition";
import { evaluateDateRange } from "./ConditionUtils";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes";

export class DateRangeCondition implements IDateRangeCondition {
  id: number;
  groupType: ConditionGroupType;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  constructor(id: number, groupType: ConditionGroupType, startMonth: number, startDay: number, endMonth: number, endDay: number) {
    this.id = id;
    this.groupType = groupType;
    this.startMonth = startMonth;
    this.startDay = startDay;
    this.endMonth = endMonth;
    this.endDay = endDay;
  }

  evaluate(now: Date): boolean {
    return evaluateDateRange(now, this.startMonth, this.startDay, this.endMonth, this.endDay);
  }
}
