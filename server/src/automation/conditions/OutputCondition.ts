import { OutputList } from "@sproot/sproot-server/src/outputs/list/OutputList";
import { ConditionBase } from "./ConditionBase";
import { ConditionOperator } from "@sproot/automation/ICondition";

export class OutputCondition extends ConditionBase {
  outputId: number;
  constructor(
    id: number,
    outputId: number,
    operator: ConditionOperator,
    rightHandSideComparison: number,
  ) {
    super(id, operator, rightHandSideComparison);
    this.outputId = outputId;
  }

  evaluate(outputList: OutputList): boolean {
    const outputValue = outputList.outputs[this.outputId]?.value;
    return outputValue != null ? super.evaluateNumber(outputValue) : false;
  }
}
