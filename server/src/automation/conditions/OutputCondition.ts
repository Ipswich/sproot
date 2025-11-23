import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes.js";
import { OutputList } from "../../outputs/list/OutputList.js";
import { evaluateNumber } from "./ConditionUtils.js";
import { IOutputCondition } from "@sproot/automation/IOutputCondition.js";

export class OutputCondition implements IOutputCondition {
  id: number;
  groupType: ConditionGroupType;
  outputId: number;
  operator: ConditionOperator;
  comparisonValue: number;

  constructor(
    id: number,
    groupType: ConditionGroupType,
    outputId: number,
    operator: ConditionOperator,
    comparisonValue: number,
  ) {
    this.id = id;
    this.groupType = groupType;
    this.outputId = outputId;
    this.operator = operator;
    this.comparisonValue = comparisonValue;
  }

  evaluate(outputList: OutputList): boolean {
    const outputValue = outputList.outputs[this.outputId]?.value;
    return outputValue != null
      ? evaluateNumber(outputValue, this.operator, this.comparisonValue)
      : false;
  }
}
