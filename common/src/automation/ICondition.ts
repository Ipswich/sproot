export interface ICondition {
  rightHandSideComparison: number;
  operator: "equal" | "notEqual" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual";
}
