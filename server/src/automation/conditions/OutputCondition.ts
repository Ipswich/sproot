import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";
import { OutputList } from "../../outputs/list/OutputList";
import { evaluateNumber } from "./ConditionUtils";
import { IOutputCondition } from "@sproot/automation/IOutputCondition";

export class OutputCondition implements IOutputCondition {
  id: number;
  groupType: ConditionGroupType;
  outputId: number;
  operator: ConditionOperator;
  comparisonValue: number;
  comparisonLookback: number | null;

  constructor(
    id: number,
    groupType: ConditionGroupType,
    outputId: number,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
  ) {
    this.id = id;
    this.groupType = groupType;
    this.outputId = outputId;
    this.operator = operator;
    this.comparisonValue = comparisonValue;
    this.comparisonLookback = comparisonLookback;
  }

  evaluate(outputList: OutputList, now: Date = new Date()): boolean {
    let result: boolean;

    const lastOutputValue = outputList.outputs[this.outputId]?.value;
    result =
      lastOutputValue != null
        ? evaluateNumber(lastOutputValue, this.operator, this.comparisonValue)
        : false;
    if (this.comparisonLookback == null || this.comparisonLookback == 0) {
      return result;
    }

    const outputValues = outputList.outputs[this.outputId]
      ?.getCachedReadings()
      .slice(-this.comparisonLookback, -1)
      .filter(
        (outputState) =>
          new Date(outputState.logTime).getTime() >=
          now.getTime() - this.comparisonLookback! * 60000,
      )
      .map((outputState) => outputState.value);

    outputValues?.push(lastOutputValue!);
    if (outputValues == null || outputValues.length < this.comparisonLookback) {
      return false;
    }

    result = outputValues.every((outputValue) => {
      return evaluateNumber(outputValue, this.operator, this.comparisonValue);
    });

    return result;
  }
}
