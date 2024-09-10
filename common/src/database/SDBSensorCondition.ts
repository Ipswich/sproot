import { RowDataPacket } from "mysql2";
import { ConditionGroupType, ConditionOperator } from "@sproot/sproot-common/src/automation/ConditionTypes";
import { ReadingType } from "../sensors/ReadingType";

type SDBSensorCondition = RowDataPacket & {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  operator: ConditionOperator;
  comparisonValue: number;
  sensorId: number;
  readingType: ReadingType;
};

export type { SDBSensorCondition };
