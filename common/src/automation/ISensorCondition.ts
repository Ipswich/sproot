import { ReadingType } from "../sensors/ReadingType";
import { ConditionGroupType } from "./ConditionTypes";

interface ISensorCondition {
  id: number;
  groupType: ConditionGroupType;
  sensorId: number;
  readingType: ReadingType;
  comparisonValue: number;
  operator: string;
}

export type { ISensorCondition };
