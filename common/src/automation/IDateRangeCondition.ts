import { ConditionGroupType } from "./ConditionTypes";

interface IDateRangeCondition {
  id: number;
  groupType: ConditionGroupType;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

export type { IDateRangeCondition };
