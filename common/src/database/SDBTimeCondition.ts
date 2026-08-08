import { ConditionGroupType } from "../automation/ConditionTypes";
import { TimeConditionPhaseAnchorType } from "../automation/ITimeCondition";

type SDBTimeCondition = {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  startTime: string | null;
  endTime: string | null;
  repeatInterval: number | null;
  repeatDuration: number | null;
  phaseAnchorType: TimeConditionPhaseAnchorType | null;
  phaseAnchorValue: string | null;
};

export type { SDBTimeCondition };
