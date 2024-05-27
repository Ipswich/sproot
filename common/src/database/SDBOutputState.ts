import { RowDataPacket } from "mysql2";
import { ControlMode } from "../outputs/IOutputBase";

interface SDBOutputState extends RowDataPacket {
  controlMode: ControlMode;
  value: number;
  logTime: string;
}

export type { SDBOutputState };
