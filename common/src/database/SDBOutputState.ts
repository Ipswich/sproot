import { RowDataPacket } from "mysql2";

interface SDBOutputState extends RowDataPacket {
  value: number;
  logTime: string;
}

export type { SDBOutputState };
