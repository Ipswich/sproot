import { ControlMode } from "../outputs/IOutputBase";

type SDBOutputState = {
  controlMode: ControlMode;
  value: number;
  logTime: string;
};

export type { SDBOutputState };
