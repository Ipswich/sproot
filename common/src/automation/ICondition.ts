export interface ICondition {
  rightHandSideComparison: number;
  operator: ConditionOperator
}

export interface ISDBCondition {
  id: number;
  automationId: number;
  type: string;
  operator: ConditionOperator;
  comparisonValue: number;
}

export type ConditionOperator = "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual";
