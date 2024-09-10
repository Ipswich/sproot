import { RowDataPacket } from "mysql2";
import { AutomationOperator } from "../automation/IAutomation";

type SDBAutomation = RowDataPacket & {
  automationId: number;
  name: string;
  operator: AutomationOperator;
};

export type { SDBAutomation };
