export interface IAutomation {
  id: number;
  name: string;
  operator: AutomationOperator;
  enabled: boolean;
  triggered?: boolean;
}

export type AutomationOperator = "and" | "or";
