import { AutomationOperator } from "../automation/IAutomation";

type SDBAutomation = {
  automationId: number;
  name: string;
  operator: AutomationOperator;
  enabled: boolean;
};

export type { SDBAutomation };
