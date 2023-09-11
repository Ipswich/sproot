import { RowDataPacket } from "mysql2";

interface GDBOutput extends RowDataPacket {
  id: number;
  description: string | null;
  pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
}

export { GDBOutput };