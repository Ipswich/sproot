import { RowDataPacket } from "mysql2";
import { ReadingType } from "../sensors/SensorBase";

interface SDBReading extends RowDataPacket {
  metric: ReadingType;
  data: string;
  units: string;
  logTime: string;
}

export type { SDBReading };