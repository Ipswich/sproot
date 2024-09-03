import { ITimeCondition } from "@sproot/automation/ITimeCondition";
import { evaluateTime } from "../ConditionUtils";
import { ConditionGroupType } from "@sproot/automation/ICondition";

export class TimeCondition implements ITimeCondition{
  id: number;
  type: ConditionGroupType;
  startTime?: string | null;
  endTime?: string | null;
  constructor(id: number, type: ConditionGroupType, startTime?: string | null, endTime?: string | null) {
    this.id = id;
    this.type = type;
    this.startTime = startTime ?? null;
    this.endTime = endTime ?? null;
  }

  evaluate(now: Date): boolean {
    return evaluateTime(now, this.startTime, this.endTime);
  }
}