import { RowDataPacket } from "mysql2";
import { ConditionOperator, ISDBCondition } from "../automation/ICondition";

type SDBOutputAutomationCondition = ISDBCondition &
  RowDataPacket & {
    id: number;
    automationId: number;
    type: string;
    operator: ConditionOperator;
    comparisonValue: number;
    outputId: number;
  };

export type { SDBOutputAutomationCondition };
