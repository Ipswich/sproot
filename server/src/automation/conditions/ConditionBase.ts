import { ConditionOperator, ICondition } from "@sproot/sproot-common/dist/automation/ICondition";
import { OutputList } from "../../outputs/list/OutputList";
import { SensorList } from "../../sensors/list/SensorList";

export abstract class ConditionBase implements ICondition {
  id: number;
  rightHandSideComparison: number;
  operator: ConditionOperator;

  constructor(
    id: number,
    operator: ConditionOperator,
    rightHandSideComparison: number,
  ) {
    this.id = id;
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
