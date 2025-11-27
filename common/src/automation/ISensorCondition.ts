import { ReadingType } from "../sensors/ReadingType";
import { ConditionGroupType } from "./ConditionTypes";

interface ISensorCondition {
  id: number;
  groupType: ConditionGroupType;
  sensorId: number;
  readingType: ReadingType;
  operator: string;
  comparisonValue: number;
  comparisonLookback: number | null;
}

export type { ISensorCondition };
