import { ConditionGroupType } from "./ConditionTypes";

interface IMonthCondition {
  id: number;
  groupType: ConditionGroupType;
  months: number;
}

export type { IMonthCondition };
