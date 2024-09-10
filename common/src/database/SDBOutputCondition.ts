import { RowDataPacket } from "mysql2";
import { ConditionGroupType, ConditionOperator } from "@sproot/sproot-common/src/automation/ConditionTypes";

type SDBOutputCondition = RowDataPacket & {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  operator: ConditionOperator
  comparisonValue: number;
  outputId: number;
};

export type { SDBOutputCondition };
