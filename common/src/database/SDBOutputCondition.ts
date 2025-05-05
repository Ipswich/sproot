import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/sproot-common/src/automation/ConditionTypes";

type SDBOutputCondition = {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  operator: ConditionOperator;
  comparisonValue: number;
  outputId: number;
  outputName: string;
};

export type { SDBOutputCondition };
