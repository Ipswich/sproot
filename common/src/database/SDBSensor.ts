import { RowDataPacket } from "mysql2";

interface SDBSensor extends RowDataPacket {
  id: number;
  description: string | null;
  model: string;
  address: string | null;
}

export type { SDBSensor };
