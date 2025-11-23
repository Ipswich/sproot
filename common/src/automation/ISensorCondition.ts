import { ReadingType } from "../sensors/ReadingType.js";
import { ConditionGroupType } from "./ConditionTypes.js";

interface ISensorCondition {
  id: number;
  groupType: ConditionGroupType;
  sensorId: number;
  readingType: ReadingType;
  comparisonValue: number;
  operator: string;
}

export type { ISensorCondition };
