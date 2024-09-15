import { RowDataPacket } from "mysql2";
import { SDBAutomation } from "./SDBAutomation";

type SDBOutputAutomation = RowDataPacket & {
  id: number;
  automationId: number;
  value: number;
}

type SDBOutputAutomationView = SDBAutomation & {
  outputAutomationId: string;
  outputId: string;
  value: number;
};

export type { SDBOutputAutomation, SDBOutputAutomationView };