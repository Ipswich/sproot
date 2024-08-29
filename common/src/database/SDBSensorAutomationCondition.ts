import { RowDataPacket } from "mysql2";
import { ConditionOperator, ISDBCondition } from "../automation/ICondition";

type SDBSensorAutomationCondition = ISDBCondition &
  RowDataPacket & {
    id: number;
    automationId: number;
    type: string;
    operator: ConditionOperator;
    comparisonValue: number;
    sensorId: number;
    readingType: string;
  };

export type { SDBSensorAutomationCondition };
