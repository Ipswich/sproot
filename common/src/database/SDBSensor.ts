import { RowDataPacket } from "mysql2";

type SDBSensor = RowDataPacket & {
  id: number;
  name: string;
  model: string;
  address: string | null;
  color: string | null;
};

export type { SDBSensor };
