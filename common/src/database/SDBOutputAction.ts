import { SDBAutomation } from "./SDBAutomation";

type SDBOutputAction = {
  id: number;
  outputId: number;
  automationId: number;
  value: number;
};

type SDBOutputActionView = SDBAutomation & {
  actionId: string;
  outputId: string;
  value: number;
};

export type { SDBOutputAction, SDBOutputActionView };
