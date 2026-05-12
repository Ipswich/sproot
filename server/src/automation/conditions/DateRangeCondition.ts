import { IDateRangeCondition } from "@sproot/automation/IDateRangeCondition";
import { evaluateDateRange } from "./ConditionUtils";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes";

export class DateRangeCondition implements IDateRangeCondition {
  id: number;
  groupType: ConditionGroupType;
  startMonth: number;
  startDate: number;
  endMonth: number;
  endDate: number;
  constructor(
    id: number,
    groupType: ConditionGroupType,
    startMonth: number,
    startDate: number,
    endMonth: number,
    endDate: number,
  ) {
    this.id = id;
    this.groupType = groupType;
    this.startMonth = startMonth;
    this.startDate = startDate;
    this.endMonth = endMonth;
    this.endDate = endDate;
  }

  evaluate(now: Date): boolean {
    return evaluateDateRange(now, this.startMonth, this.startDate, this.endMonth, this.endDate);
  }
}
