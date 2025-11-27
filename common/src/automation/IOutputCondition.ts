import { ConditionGroupType } from "./ConditionTypes";

interface IOutputCondition {
  id: number;
  groupType: ConditionGroupType;
  outputId: number;
  operator: string;
  comparisonValue: number;
  comparisonLookback: number | null;
}

export type { IOutputCondition };
