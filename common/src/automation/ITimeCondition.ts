import { ConditionGroupType } from "./ICondition";

interface ITimeCondition {
  id: number;
  group: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
}

export type { ITimeCondition };