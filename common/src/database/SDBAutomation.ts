import { AutomationOperator } from "../automation/IAutomation.js";

type SDBAutomation = {
  automationId: number;
  name: string;
  operator: AutomationOperator;
  enabled: boolean;
};

export type { SDBAutomation };
