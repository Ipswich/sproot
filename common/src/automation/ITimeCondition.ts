import { ConditionGroupType } from "./ConditionTypes";

type TimeConditionPhaseAnchorType = "default" | "epoch" | "window" | "clock" | "fixed";

interface ITimeCondition {
  id: number;
  groupType: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
  repeatInterval?: number | null;
  repeatDuration?: number | null;
  phaseAnchorType?: TimeConditionPhaseAnchorType | null;
  phaseAnchorValue?: string | null;
}

export type { ITimeCondition, TimeConditionPhaseAnchorType };
