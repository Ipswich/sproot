import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ICondition";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { SensorList } from "../../sensors/list/SensorList";
import { evaluateNumber } from "./ConditionUtils";
import { ISensorCondition } from "@sproot/automation/ISensorCondition";

export class SensorCondition implements ISensorCondition{
  id: number;
  group: ConditionGroupType;
  sensorId: number;
  readingType: ReadingType;
  operator: ConditionOperator;
  comparisonValue: number;

  constructor(
    id: number,
    group: ConditionGroupType,
    sensorId: number,
    readingType: ReadingType,
    operator: ConditionOperator,
    comparisonValue: number,
  ) {
    this.id = id;
    this.group = group;
    this.sensorId = sensorId;
    this.readingType = readingType;
    this.operator = operator;
    this.comparisonValue = comparisonValue;
  }

  evaluate(sensorList: SensorList): boolean {
    const reading = sensorList.sensors[this.sensorId]?.lastReading[this.readingType];
    return reading != null ? evaluateNumber(parseFloat(reading), this.operator, this.comparisonValue) : false;
  }
}
