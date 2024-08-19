import { RowDataPacket } from "mysql2";
import { ISDBCondition } from "../automation/ICondition";

type SDBSensorAutomationCondition = ISDBCondition &
  RowDataPacket & {
    id: number;
    automationId: number;
    type: string;
    operator: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual";
    comparisonValue: number;
    sensorId: number;
    readingType: string;
  };

export type { SDBSensorAutomationCondition };
