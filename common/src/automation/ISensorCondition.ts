import { ReadingType } from "../sensors/ReadingType";
import { ConditionGroupType } from "./ICondition";

interface ISensorCondition {
  id: number;
  group: ConditionGroupType;
  sensorId: number;
  readingType: ReadingType;
  comparisonValue: number;
  operator: string;
}

export type { ISensorCondition };