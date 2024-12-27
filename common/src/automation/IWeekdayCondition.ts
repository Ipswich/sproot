import { ConditionGroupType } from "./ConditionTypes";

interface IWeekdayCondition {
  id: number;
  groupType: ConditionGroupType;
  weekdays: number;
}

export type { IWeekdayCondition };
