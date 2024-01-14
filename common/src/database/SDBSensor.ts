import { RowDataPacket } from "mysql2";

interface SDBSensor extends RowDataPacket {
  id: number;
  name: string;
  model: string;
  address: string | null;
}

export type { SDBSensor };
