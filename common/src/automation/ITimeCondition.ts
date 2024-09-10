import { ConditionGroupType } from "./ConditionTypes";

interface ITimeCondition {
  id: number;
  groupType: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
}

export type { ITimeCondition };