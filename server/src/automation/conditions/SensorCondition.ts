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
    let result: boolean;
    if (this.comparisonLookback != null) {
      const readings = sensorList.sensors[this.sensorId]?.getCachedReadings(
        this.comparisonLookback,
      )[this.readingType];
      if (readings == null || readings.length < this.comparisonLookback) {
        return false;
      }
      result = readings.every((reading) => {
        // If reading is older than the lookback period, ignore it
        if (new Date(reading.logTime.replace(" ", "T") + "Z").getTime() < now.getTime() - this.comparisonLookback! * 60000) {
          return false;
        }

        return evaluateNumber(parseFloat(reading.data), this.operator, this.comparisonValue)
      });
    } else {
      const reading = sensorList.sensors[this.sensorId]?.lastReading[this.readingType];

      return reading != null
        ? evaluateNumber(parseFloat(reading), this.operator, this.comparisonValue)
        : false;
    }
    return result;
  }
}
