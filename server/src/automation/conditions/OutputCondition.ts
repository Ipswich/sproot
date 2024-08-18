import { OutputList } from "@sproot/sproot-server/src/outputs/list/OutputList";
import { ConditionBase } from "./ConditionBase";

export class OutputCondition extends ConditionBase {
  outputId: number;
  constructor(
    outputId: number,
    operator: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual",
    rightHandSideComparison: number,
  ) {
    super(operator, rightHandSideComparison);
    this.outputId = outputId;
  }

  evaluate(outputList: OutputList): boolean {
    const outputValue = outputList.outputs[this.outputId]?.value;
    return outputValue != null ? super.evaluateNumber(outputValue) : false;
  }
}
