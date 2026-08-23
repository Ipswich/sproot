import { ConditionGroupType } from "./ConditionTypes";

type TimeConditionPhaseAnchorType = "default" | "epoch" | "window" | "clock" | "fixed";

interface ITimeCondition {
  id: number;
  groupType: ConditionGroupType;
  startTime?: string | null;
  startOffsetSeconds?: number | null;
  endTime?: string | null;
  endOffsetSeconds?: number | null;
  repeatInterval?: number | null;
  repeatDuration?: number | null;
  phaseAnchorType?: TimeConditionPhaseAnchorType | null;
  phaseAnchorValue?: string | null;
}

export type { ITimeCondition, TimeConditionPhaseAnchorType };
