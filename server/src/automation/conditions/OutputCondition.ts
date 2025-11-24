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
    if (this.comparisonLookback != null) {
      const outputValues = outputList.outputs[this.outputId]?.getCachedReadings(
        this.comparisonLookback,
      );
      if (outputValues == null || outputValues.length < this.comparisonLookback) {
        return false;
      }
      result = outputValues.every((outputValue) => {
        // If reading is older than the lookback period, ignore it
        if (
          new Date(outputValue.logTime.replace(" ", "T") + "Z").getTime() <
          now.getTime() - this.comparisonLookback! * 60000
        ) {
          return false;
        }

        return evaluateNumber(outputValue.value, this.operator, this.comparisonValue);
      });
    } else {
      const outputValue = outputList.outputs[this.outputId]?.value;

      return outputValue != null
        ? evaluateNumber(outputValue, this.operator, this.comparisonValue)
        : false;
    }
    return result;
  }
}
