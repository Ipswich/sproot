import { ConditionGroupType } from "./ICondition";

interface IOutputCondition {
  id: number;
  group: ConditionGroupType;
  outputId: number;
  comparisonValue: number;
  operator: string;
}

export type { IOutputCondition };