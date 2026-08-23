import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { SensorList } from "../../sensors/list/SensorList";
import { evaluateNumber } from "./ConditionUtils";
import { ISensorCondition } from "@sproot/automation/ISensorCondition";
import type { ISensorConditionsRepository } from "../../database/repositories/automations/conditions/ISensorConditionsRepository";

export class SensorCondition implements ISensorCondition {
  id: number;
  groupType: ConditionGroupType;
  sensorId: number;
  readingType: ReadingType;
  operator: ConditionOperator;
  comparisonValue: number;
  comparisonLookback: number | null;
  #latestViolationAt: number | null = null;

  constructor(
    id: number,
    groupType: ConditionGroupType,
    sensorId: number,
    readingType: ReadingType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
  ) {
    this.id = id;
    this.groupType = groupType;
    this.sensorId = sensorId;
    this.readingType = readingType;
    this.operator = operator;
    this.comparisonValue = comparisonValue;
    this.comparisonLookback = comparisonLookback;
  }

  evaluate(sensorList: SensorList, now: Date = new Date()): boolean {
    if (this.comparisonLookback == null || this.comparisonLookback == 0) {
      const lastSensorValue = sensorList.sensors[this.sensorId]?.lastReading[this.readingType];
      return lastSensorValue != null
        ? evaluateNumber(parseFloat(lastSensorValue), this.operator, this.comparisonValue)
        : false;
    }

    const lastSensorValue = sensorList.sensors[this.sensorId]?.lastReading[this.readingType];
    if (
      lastSensorValue != null &&
      !evaluateNumber(parseFloat(lastSensorValue), this.operator, this.comparisonValue)
    ) {
      this.#latestViolationAt = now.getTime();
    }

    this.#expireViolationIfNeeded(now);
    return this.#latestViolationAt == null;
  }

  async initializeLookbackStateAsync(
    repository: ISensorConditionsRepository,
    now: Date = new Date(),
  ): Promise<void> {
    if (this.comparisonLookback == null || this.comparisonLookback <= 0) {
      this.#latestViolationAt = null;
      return;
    }

    const latestViolation = await repository.getMostRecentViolationAsync(
      this.sensorId,
      this.readingType,
      this.operator,
      this.comparisonValue,
      this.comparisonLookback,
      now,
    );

    this.#latestViolationAt = latestViolation?.getTime() ?? null;
    this.#expireViolationIfNeeded(now);
  }

  #expireViolationIfNeeded(now: Date): void {
    if (
      this.#latestViolationAt == null ||
      this.comparisonLookback == null ||
      this.comparisonLookback <= 0
    ) {
      return;
    }

    if (now.getTime() - this.#latestViolationAt >= this.comparisonLookback * 60000) {
      this.#latestViolationAt = null;
    }
  }
}
