import { ConditionGroupType } from "./ConditionTypes.js";

interface IOutputCondition {
  id: number;
  groupType: ConditionGroupType;
  outputId: number;
  comparisonValue: number;
  operator: string;
}

export type { IOutputCondition };
