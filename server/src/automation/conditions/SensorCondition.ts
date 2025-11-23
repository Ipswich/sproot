import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes.js";
import { ReadingType } from "@sproot/sensors/ReadingType.js";
import { SensorList } from "../../sensors/list/SensorList.js";
import { evaluateNumber } from "./ConditionUtils.js";
import { ISensorCondition } from "@sproot/automation/ISensorCondition.js";

export class SensorCondition implements ISensorCondition {
  id: number;
  groupType: ConditionGroupType;
  sensorId: number;
  readingType: ReadingType;
  operator: ConditionOperator;
  comparisonValue: number;

  constructor(
    id: number,
    groupType: ConditionGroupType,
    sensorId: number,
    readingType: ReadingType,
    operator: ConditionOperator,
    comparisonValue: number,
  ) {
    this.id = id;
    this.groupType = groupType;
    this.sensorId = sensorId;
    this.readingType = readingType;
    this.operator = operator;
    this.comparisonValue = comparisonValue;
  }

  evaluate(sensorList: SensorList): boolean {
    const reading = sensorList.sensors[this.sensorId]?.lastReading[this.readingType];
    return reading != null
      ? evaluateNumber(parseFloat(reading), this.operator, this.comparisonValue)
      : false;
  }
}
