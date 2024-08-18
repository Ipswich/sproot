import { ICondition } from "@sproot/sproot-common/src/automation/ICondition";
import { OutputList } from "../../outputs/list/OutputList";
import { SensorList } from "../../sensors/list/SensorList";

export abstract class ConditionBase implements ICondition {
  rightHandSideComparison: number;
  operator: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual";

  constructor(
    operator: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual",
    rightHandSideComparison: number,
  ) {
    this.rightHandSideComparison = rightHandSideComparison;
    this.operator = operator;
  }

  abstract evaluate(list: SensorList | OutputList): boolean;

  protected evaluateNumber(reading: number): boolean {
    switch (this.operator) {
      case "equal":
        return reading == this.rightHandSideComparison;
      case "notEqual":
        return reading != this.rightHandSideComparison;
      case "greater":
        return reading > this.rightHandSideComparison;
      case "less":
        return reading < this.rightHandSideComparison;
      case "greaterOrEqual":
        return reading >= this.rightHandSideComparison;
      case "lessOrEqual":
        return reading <= this.rightHandSideComparison;
    }
  }
}
