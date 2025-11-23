import { RowDataPacket } from "mysql2";
import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/sproot-common/src/automation/ConditionTypes.js";
import { ReadingType } from "../sensors/ReadingType.js";

type SDBSensorCondition = RowDataPacket & {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  operator: ConditionOperator;
  comparisonValue: number;
  sensorId: number;
  sensorName: string;
  readingType: ReadingType;
};

export type { SDBSensorCondition };
