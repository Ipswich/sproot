
export interface IAutomation {
  id: number;
  name: string;
  value: number;
  operator: AutomationOperator;
}

export type AutomationOperator = "and" | "or";