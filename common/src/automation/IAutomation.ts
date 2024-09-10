export interface IAutomation {
  id: number;
  name: string;
  operator: AutomationOperator;
}

export type AutomationOperator = "and" | "or";