import { ConditionGroupType } from "./ICondition";

interface ITimeCondition {
  id: number;
  type: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
}

export type { ITimeCondition };