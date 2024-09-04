import { ConditionGroupType } from "./ICondition";

interface IOutputCondition {
  id: number;
  groupType: ConditionGroupType;
  outputId: number;
  comparisonValue: number;
  operator: string;
}

export type { IOutputCondition };