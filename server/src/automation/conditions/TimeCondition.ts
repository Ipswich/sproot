import { ITimeCondition } from "@sproot/automation/ITimeCondition";
import { evaluateTime } from "./ConditionUtils";
import { ConditionGroupType } from "@sproot/automation/ICondition";

export class TimeCondition implements ITimeCondition{
  id: number;
  group: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
  constructor(id: number, group: ConditionGroupType, startTime?: string | null, endTime?: string | null) {
    this.id = id;
    this.group = group;
    this.startTime = startTime ?? null;
    this.endTime = endTime ?? null;
  }

  evaluate(now: Date): boolean {
    return evaluateTime(now, this.startTime, this.endTime);
  }
}