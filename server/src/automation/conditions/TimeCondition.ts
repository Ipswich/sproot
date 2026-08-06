import { ITimeCondition, TimeConditionPhaseAnchorType } from "@sproot/automation/ITimeCondition";
import { evaluateTime } from "./ConditionUtils";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes";
import { TimeExpressionResolver } from "./TimeExpressionResolver";

export class TimeCondition implements ITimeCondition {
  id: number;
  groupType: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
  repeatInterval?: number | null;
  repeatDuration?: number | null;
  phaseAnchorType?: TimeConditionPhaseAnchorType | null;
  phaseAnchorValue?: string | null;
  #timeExpressionResolver: TimeExpressionResolver;
  constructor(
    id: number,
    groupType: ConditionGroupType,
    startTime?: string | null,
    endTime?: string | null,
    repeatInterval?: number | null,
    repeatDuration?: number | null,
    phaseAnchorType?: TimeConditionPhaseAnchorType | null,
    phaseAnchorValue?: string | null,
    timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
  ) {
    this.id = id;
    this.groupType = groupType;
    this.#timeExpressionResolver = timeExpressionResolver;
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
      this.#timeExpressionResolver,
      this.startTime,
      this.endTime,
      this.repeatInterval,
      this.repeatDuration,
      this.phaseAnchorType,
      this.phaseAnchorValue,
    );
  }
}
