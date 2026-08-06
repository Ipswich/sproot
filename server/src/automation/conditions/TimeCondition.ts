import { ITimeCondition, TimeConditionPhaseAnchorType } from "@sproot/automation/ITimeCondition";
import { evaluateTime } from "./ConditionUtils";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes";

export class TimeCondition implements ITimeCondition {
  id: number;
  groupType: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
  repeatInterval?: number | null;
  repeatDuration?: number | null;
  phaseAnchorType?: TimeConditionPhaseAnchorType | null;
  phaseAnchorValue?: string | null;
  constructor(
    id: number,
    groupType: ConditionGroupType,
    startTime?: string | null,
    endTime?: string | null,
    repeatInterval?: number | null,
    repeatDuration?: number | null,
    phaseAnchorType?: TimeConditionPhaseAnchorType | null,
    phaseAnchorValue?: string | null,
  ) {
    this.id = id;
    this.groupType = groupType;
    this.startTime = startTime ?? null;
    this.endTime = endTime ?? null;
    this.repeatInterval = repeatInterval ?? null;
    this.repeatDuration = repeatDuration ?? null;
    this.phaseAnchorType = phaseAnchorType ?? null;
    this.phaseAnchorValue = phaseAnchorValue ?? null;
  }

  evaluate(now: Date): boolean {
    return evaluateTime(
      now,
      this.startTime,
      this.endTime,
      this.repeatInterval,
      this.repeatDuration,
      this.phaseAnchorType,
      this.phaseAnchorValue,
    );
  }
}
