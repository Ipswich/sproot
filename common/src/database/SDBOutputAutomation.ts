import { SDBAutomation } from "./SDBAutomation";

type SDBOutputAutomation = SDBAutomation & {
  outputAutomationId: string;
  outputId: string;
  value: number;
};

export type { SDBOutputAutomation };