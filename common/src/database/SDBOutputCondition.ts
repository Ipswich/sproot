import { ConditionGroupType, ConditionOperator } from "../automation/ConditionTypes";

type SDBOutputCondition = {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  operator: ConditionOperator;
  comparisonValue: number;
  comparisonLookback: number | null;
  outputId: number;
  outputName: string;
};

export type { SDBOutputCondition };
