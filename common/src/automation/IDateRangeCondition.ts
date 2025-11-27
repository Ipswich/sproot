import { ConditionGroupType } from "./ConditionTypes";

interface IDateRangeCondition {
  id: number;
  groupType: ConditionGroupType;
  startMonth: number;
  startDate: number;
  endMonth: number;
  endDate: number;
}

export type { IDateRangeCondition };
