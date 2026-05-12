import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { SensorList } from "../../sensors/list/SensorList";
import { evaluateNumber } from "./ConditionUtils";
import { ISensorCondition } from "@sproot/automation/ISensorCondition";

export class SensorCondition implements ISensorCondition {
  id: number;
  groupType: ConditionGroupType;
  sensorId: number;
  readingType: ReadingType;
  operator: ConditionOperator;
  comparisonValue: number;
  comparisonLookback: number | null;

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

    const sensorValues = sensorList.sensors[this.sensorId]
      ?.getCachedReadings()
      ?.[this.readingType]?.slice(-this.comparisonLookback)
      ?.filter(
        (lastReading) =>
          new Date(lastReading.logTime).getTime() >=
          now.getTime() - this.comparisonLookback! * 60000,
      )
      ?.map((lastReading) => lastReading.data);

    if (sensorValues == null || sensorValues.length < this.comparisonLookback) {
      return false;
    }

    return sensorValues.every((sensorValue) => {
      return evaluateNumber(parseFloat(sensorValue), this.operator, this.comparisonValue);
    });
  }
}
