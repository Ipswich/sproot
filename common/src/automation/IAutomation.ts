export interface IAutomation {
  id: number;
  name: string;
  operator: AutomationOperator;
  lastRunTime: Date | null;
}

export type AutomationOperator = "and" | "or";
