import { RowDataPacket } from "mysql2";
import { ConditionGroupType, ConditionOperator } from "../automation/ICondition";

type SDBOutputAutomationCondition = RowDataPacket & {
  id: number;
  automationId: number;
  type: ConditionGroupType;
  operator: ConditionOperator
  comparisonValue: number;
  outputId: number;
};

export type { SDBOutputAutomationCondition };
