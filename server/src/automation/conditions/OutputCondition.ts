import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";
import { OutputList } from "../../outputs/list/OutputList";
import { evaluateNumber } from "./ConditionUtils";
import { IOutputCondition } from "@sproot/automation/IOutputCondition";
import type { IOutputConditionsRepository } from "../../database/repositories/automations/conditions/IOutputConditionsRepository";

export class OutputCondition implements IOutputCondition {
  id: number;
  groupType: ConditionGroupType;
  outputId: number;
  operator: ConditionOperator;
  comparisonValue: number;
  comparisonLookback: number | null;
  #latestViolationAt: number | null = null;

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
    if (this.comparisonLookback == null || this.comparisonLookback == 0) {
      const lastOutputValue = outputList.outputs[this.outputId]?.value;
      return lastOutputValue != null
        ? evaluateNumber(lastOutputValue, this.operator, this.comparisonValue)
        : false;
    }

    const lastOutputValue = outputList.outputs[this.outputId]?.value;
    if (lastOutputValue != null && !evaluateNumber(lastOutputValue, this.operator, this.comparisonValue)) {
      this.#latestViolationAt = now.getTime();
    }

    this.#expireViolationIfNeeded(now);
    return this.#latestViolationAt == null;
  }

  async initializeLookbackStateAsync(
    repository: IOutputConditionsRepository,
    now: Date = new Date(),
  ): Promise<void> {
    if (this.comparisonLookback == null || this.comparisonLookback <= 0) {
      this.#latestViolationAt = null;
      return;
    }

    const latestViolation = await repository.getMostRecentViolationAsync(
      this.outputId,
      this.operator,
      this.comparisonValue,
      this.comparisonLookback,
      now,
    );

    this.#latestViolationAt = latestViolation?.getTime() ?? null;
    this.#expireViolationIfNeeded(now);
  }

  #expireViolationIfNeeded(now: Date): void {
    if (this.#latestViolationAt == null || this.comparisonLookback == null || this.comparisonLookback <= 0) {
      return;
    }

    if (now.getTime() - this.#latestViolationAt >= this.comparisonLookback * 60000) {
      this.#latestViolationAt = null;
    }
  }
}
