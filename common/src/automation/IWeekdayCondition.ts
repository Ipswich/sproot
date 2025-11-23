import { ConditionGroupType } from "./ConditionTypes.js";

interface IWeekdayCondition {
  id: number;
  groupType: ConditionGroupType;
  weekdays: number;
}

export type { IWeekdayCondition };
