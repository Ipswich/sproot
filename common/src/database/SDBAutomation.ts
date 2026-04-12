import { AutomationOperator } from "../automation/IAutomation";

type SDBAutomation = {
  id: number;
  name: string;
  operator: AutomationOperator;
  enabled: boolean;
};

export type { SDBAutomation };
