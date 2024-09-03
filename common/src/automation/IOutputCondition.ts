import { ConditionGroupType } from "./ICondition";

interface IOutputCondition {
  id: number;
  type: ConditionGroupType;
  outputId: number;
  comparisonValue: number;
  operator: string;
}

export type { IOutputCondition };