import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/sproot-common/src/automation/ConditionTypes";
import { ReadingType } from "../sensors/ReadingType";

type SDBSensorCondition = {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  operator: ConditionOperator;
  comparisonValue: number;
  comparisonLookback: number | null;
  sensorId: number;
  sensorName: string;
  readingType: ReadingType;
};

export type { SDBSensorCondition };
