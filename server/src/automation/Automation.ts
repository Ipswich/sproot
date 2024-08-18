import { OutputList } from "../outputs/list/OutputList";
import { SensorList } from "../sensors/list/SensorList";
import { ConditionBase } from "./conditions/ConditionBase";
import { OutputCondition } from "./conditions/OutputCondition";
import { SensorCondition } from "./conditions/SensorCondition";

export class Automation {
  value: number;
  conditionOperator: "and" | "or";
  conditions: {
    allOf: ConditionBase[];
    anyOf: ConditionBase[];
    oneOf: ConditionBase[];
  };
  startTime?: string | undefined; //24 hour, e.g. "hh:mm" OR null
  endTime?: string | undefined; //24 hour, e.g. "hh:mm" OR null

  constructor(
    value: number,
    conditionOperator: "and" | "or",
    conditions: { allOf: ConditionBase[]; anyOf: ConditionBase[]; oneOf: ConditionBase[] },
    startTime?: string,
    endTime?: string,
  ) {
    this.startTime = startTime;
    this.endTime = endTime;
    this.value = value;
    this.conditionOperator = conditionOperator;
    this.conditions = conditions;
  }

  evaluate(now: Date, sensorList: SensorList, outputList: OutputList): boolean {
    // if both startTime and endTime and between those two, evaluate
    if (
      this.startTime != null &&
      this.endTime != null &&
      isBetweenTimeStamp(this.startTime, this.endTime, now)
    ) {
      return this.#evaluateConditions(sensorList, outputList);
    } // if no startTime and no endTime, evaluate
    else if (this.startTime == null && this.endTime == null) {
      return this.#evaluateConditions(sensorList, outputList);
    } //if startTime and no endTime and startTime is now, evaluate
    else if (this.startTime != null && this.endTime == null) {
      const [startHours, startMinutes] = this.startTime.split(":").map(Number);
      if (startHours == now.getHours() && startMinutes == now.getMinutes()) {
        return this.#evaluateConditions(sensorList, outputList);
      }
    }
    return false;
  }

  #evaluateConditions(sensorList: SensorList, outputList: OutputList): boolean {
    const evaluateByConditionType = (condition: ConditionBase) => {
      if (condition instanceof SensorCondition) {
        return condition.evaluate(sensorList);
      }
      if (condition instanceof OutputCondition) {
        return condition.evaluate(outputList);
      }
    };

    // If no conditions, obviously true.
    if (
      this.conditions.allOf.length == 0 &&
      this.conditions.anyOf.length == 0 &&
      this.conditions.oneOf.length == 0
    ) {
      return true;
    }

    // Things get weird if any of the lists are empty. If we default to returning true and
    // the conditionOperator is "or", it'll always result in true (even if one of the condition
    // types is false). Conversely, if we default to returning false and the conditionOperator
    // is "false", it'll always result in false (even if one of the condition types is true).
    // Basically, we need to "ignore" empty condition types.
    let defaultReturnValue = this.conditionOperator == "and";

    const allOfEvaluationMap = this.conditions.allOf.map((c) => evaluateByConditionType(c));
    const allOfResult =
      allOfEvaluationMap.length == 0
        ? defaultReturnValue
        : allOfEvaluationMap.every((c) => c == true);

    const anyOfEvaluationMap = this.conditions.anyOf.map((c) => evaluateByConditionType(c));
    const anyOfResult =
      anyOfEvaluationMap.length == 0
        ? defaultReturnValue
        : anyOfEvaluationMap.some((c) => c == true);

    const oneOfEvaluationMap = this.conditions.oneOf.map((c) => evaluateByConditionType(c));
    const oneOfResult =
      oneOfEvaluationMap.length == 0
        ? defaultReturnValue
        : oneOfEvaluationMap.filter((c) => c == true).length == 1;

    switch (this.conditionOperator) {
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
