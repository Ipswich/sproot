import { RowDataPacket } from "mysql2";

type SDBOutput = RowDataPacket & {
  id: number;
  model: string;
  address: string;
  name: string;
  pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  color: string | null;
};

export type { SDBOutput };
