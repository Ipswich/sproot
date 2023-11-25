import { RowDataPacket } from "mysql2";

interface SDBOutput extends RowDataPacket {
  id: number;
  model: string;
  address: string;
  description: string | null;
  pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
}

export type { SDBOutput };
