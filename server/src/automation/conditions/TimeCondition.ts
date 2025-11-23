import { ITimeCondition } from "@sproot/automation/ITimeCondition.js";
import { evaluateTime } from "./ConditionUtils.js";
import { ConditionGroupType } from "@sproot/automation/ConditionTypes.js";

export class TimeCondition implements ITimeCondition {
  id: number;
  groupType: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
  constructor(
    id: number,
    groupType: ConditionGroupType,
    startTime?: string | null,
    endTime?: string | null,
  ) {
    this.id = id;
    this.groupType = groupType;
    this.startTime = startTime ?? null;
    this.endTime = endTime ?? null;
  }

  evaluate(now: Date): boolean {
    return evaluateTime(now, this.startTime, this.endTime);
  }
}
