import { RowDataPacket } from "mysql2";
import { ControlMode } from "../outputs/IOutputBase";

type SDBOutputState = RowDataPacket & {
  controlMode: ControlMode;
  value: number;
  logTime: string;
};

export type { SDBOutputState };
