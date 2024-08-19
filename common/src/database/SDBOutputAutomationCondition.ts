import { RowDataPacket } from "mysql2";
import { ISDBCondition } from "../automation/ICondition";

type SDBOutputAutomationCondition = ISDBCondition &
  RowDataPacket & {
    id: number;
    automationId: number;
    type: string;
    operator: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual";
    comparisonValue: number;
    outputId: number;
  };

export type { SDBOutputAutomationCondition };
