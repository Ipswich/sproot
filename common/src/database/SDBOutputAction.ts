import { SDBAutomation } from "./SDBAutomation";
import { OutputActionPrecedence } from "../automation/OutputActionPrecedence";

type SDBOutputAction = {
  id: number;
  outputId: number;
  automationId: number;
  value: number;
  precedence: OutputActionPrecedence;
  automationName?: string;
};

type SDBOutputActionView = SDBAutomation & {
  actionId: string;
  outputId: string;
  value: number;
  precedence: OutputActionPrecedence;
};

export type { SDBOutputAction, SDBOutputActionView };
