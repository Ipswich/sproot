import { AutomationOperator } from "../automation/IAutomation";

type SDBAutomation = {
  automationId: number;
  name: string;
  operator: AutomationOperator;
  lastRunTime: string;
};

export type { SDBAutomation };
