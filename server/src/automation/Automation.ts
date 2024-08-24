import { OutputList } from "../outputs/list/OutputList";
import { SensorList } from "../sensors/list/SensorList";
import IAutomation, { IAutomationRules } from "@sproot/automation/IAutomation";
import { ConditionBase } from "./conditions/ConditionBase";
import { OutputCondition } from "./conditions/OutputCondition";
import { SensorCondition } from "./conditions/SensorCondition";

export class Automation implements IAutomation {
  id: number;
  name: string;
  value: number;
  rules: AutomationRules;
  startTime?: string | undefined | null; //24 hour, e.g. "hh:mm" OR null
  endTime?: string | undefined | null; //24 hour, e.g. "hh:mm" OR null

  constructor(
    id: number,
    name: string,
    value: number,
    conditions: AutomationRules,
    startTime?: string | undefined | null,
    endTime?: string | undefined | null,
  ) {
    this.id = id;
    this.name = name;
    this.startTime = startTime;
    this.endTime = endTime;
    this.value = value;
    this.rules = conditions;
  }

  evaluate(now: Date, sensorList: SensorList, outputList: OutputList): number | null {
    // if both startTime and endTime and between those two, evaluate
    if (
      this.startTime != null &&
      this.endTime != null &&
      isBetweenTimeStamp(this.startTime, this.endTime, now)
    ) {
      return this.rules.evaluate(sensorList, outputList) ? this.value : null;
    } // if no startTime and no endTime, evaluate
    else if (this.startTime == null && this.endTime == null) {
      return this.rules.evaluate(sensorList, outputList) ? this.value : null;
    } //if startTime and no endTime and startTime is now, evaluate
    else if (this.startTime != null && this.endTime == null) {
      const [startHours, startMinutes] = this.startTime.split(":").map(Number);
      if (startHours == now.getHours() && startMinutes == now.getMinutes()) {
        return this.rules.evaluate(sensorList, outputList) ? this.value : null;
      }
    }
    return null
  }
}

export class AutomationRules implements IAutomationRules {
  operator: "and" | "or";
  allOf: ConditionBase[];
  anyOf: ConditionBase[];
  oneOf: ConditionBase[];

  constructor(
    operator: "and" | "or",
    allOf: ConditionBase[],
    anyOf: ConditionBase[],
    oneOf: ConditionBase[],
  ) {
    this.operator = operator;
    this.allOf = allOf;
    this.anyOf = anyOf;
    this.oneOf = oneOf;
  }

  evaluate(sensorList: SensorList, outputList: OutputList): boolean {
    const evaluateByConditionType = (condition: ConditionBase) => {
      if (condition instanceof SensorCondition) {
        return condition.evaluate(sensorList);
      }
      if (condition instanceof OutputCondition) {
        return condition.evaluate(outputList);
      }
      return false;
    };

    // If no conditions, obviously true.
    if (this.allOf.length == 0 && this.anyOf.length == 0 && this.oneOf.length == 0) {
      return true;
    }

    // Things get weird if any of the lists are empty. If we default to returning true and
    // the conditionOperator is "or", it'll always result in true (even if one of the condition
    // types is false). Conversely, if we default to returning false and the conditionOperator
    // is "false", it'll always result in false (even if one of the condition types is true).
    // Basically, we need to "ignore" empty condition types.
    let defaultReturnValue = this.operator == "and";

    const allOfEvaluationMap = this.allOf.map((c) => evaluateByConditionType(c));
    const allOfResult =
      allOfEvaluationMap.length == 0
        ? defaultReturnValue
        : allOfEvaluationMap.every((c) => c == true);

    const anyOfEvaluationMap = this.anyOf.map((c) => evaluateByConditionType(c));
    const anyOfResult =
      anyOfEvaluationMap.length == 0
        ? defaultReturnValue
        : anyOfEvaluationMap.some((c) => c == true);

    const oneOfEvaluationMap = this.oneOf.map((c) => evaluateByConditionType(c));
    const oneOfResult =
      oneOfEvaluationMap.length == 0
        ? defaultReturnValue
        : oneOfEvaluationMap.filter((c) => c == true).length == 1;

    switch (this.operator) {
      case "and":
        return allOfResult && anyOfResult && oneOfResult;
      case "or":
        return allOfResult || anyOfResult || oneOfResult;
    }
  }
}

/**
 * Includes start time, excludes end time.
 */
export function isBetweenTimeStamp(startTime: string, endTime: string, now: Date): boolean {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  //In case now isn't really "now".
  const nowHours = now.getHours();
  const nowMInutes = now.getMinutes();
  const nowDate = new Date();
  nowDate.setHours(nowHours, nowMInutes, 0, 0);

  const start = new Date();
  start.setHours(startHours!, startMinutes, 0, 0);

  const end = new Date();
  end.setHours(endHours!, endMinutes, 0, 0);

  // If the end time is before the start time, assume it crosses midnight
  if (end < start) {
    return nowDate >= start || nowDate < end;
  }

  return nowDate >= start && nowDate < end;
}
