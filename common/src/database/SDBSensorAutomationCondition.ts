import { RowDataPacket } from "mysql2";
import { ConditionGroupType, ConditionOperator } from "../automation/ICondition";
import { ReadingType } from "../sensors/ReadingType";

type SDBSensorAutomationCondition = RowDataPacket & {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  operator: ConditionOperator;
  comparisonValue: number;
  sensorId: number;
  readingType: ReadingType;
};

export type { SDBSensorAutomationCondition };
