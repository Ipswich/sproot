import { RowDataPacket } from "mysql2";

interface GDBSensor extends RowDataPacket {
  id: number;
  description: string;
  model: string;
  address: string | null;
}

export { GDBSensor };