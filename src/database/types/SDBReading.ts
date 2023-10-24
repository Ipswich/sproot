import { RowDataPacket } from "mysql2/promise";
import { ReadingType } from "../../sensors/types/SensorBase";

interface SDBReading extends RowDataPacket {
  metric: ReadingType;
  data: string;
  units: string;
  logTime: string;
}

export { SDBReading };
