import { RowDataPacket } from "mysql2";

type SDBAutomation = RowDataPacket & {
  id: number;
  name: string;
  outputId: number;
  value: number;
  operator: "and" | "or";
  startTime: string | null;
  endTime: string | null;
};

export type { SDBAutomation };
