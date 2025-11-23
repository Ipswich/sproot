import { ConditionGroupType } from "./ConditionTypes.js";

interface ITimeCondition {
  id: number;
  groupType: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
}

export type { ITimeCondition };
