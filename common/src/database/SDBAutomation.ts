import { RowDataPacket } from "mysql2";
import { AutomationOperator } from "../automation/IAutomation";

type SDBAutomation = RowDataPacket & {
  id: number;
  name: string;
  outputId: number;
  value: number;
  operator: AutomationOperator;
};

export type { SDBAutomation };
