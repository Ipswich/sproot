export interface ICondition {
  rightHandSideComparison: number;
  operator: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual";
}

export interface ISDBCondition {
  id: number;
  automationId: number;
  type: string;
  operator: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual";
  comparisonValue: number;
}

export const ValidOperators = [
  "equal",
  "notEqual",
  "greater",
  "less",
  "greaterOrEqual",
  "lessOrEqual",
] as const;
