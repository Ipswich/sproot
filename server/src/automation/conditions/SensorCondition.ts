import { SensorList } from "@sproot/sproot-server/src/sensors/list/SensorList";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { ConditionBase } from "./ConditionBase";

export class SensorCondition extends ConditionBase {
  sensorId: number;
  readingType: ReadingType;

  constructor(
    sensorId: number,
    readingType: ReadingType,
    operator: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual",
    rightHandSideComparison: number,
  ) {
    super(operator, rightHandSideComparison);
    this.sensorId = sensorId;
    this.readingType = readingType;
    this.rightHandSideComparison = rightHandSideComparison;
    this.operator = operator;
  }

  evaluate(sensorList: SensorList): boolean {
    const reading = sensorList.sensors[this.sensorId]?.lastReading[this.readingType];
    return reading != null ? super.evaluateNumber(parseFloat(reading)) : false;
  }
}
