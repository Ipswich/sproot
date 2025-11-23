import { ControlMode } from "../outputs/IOutputBase.js";

type SDBOutputState = {
  controlMode: ControlMode;
  value: number;
  logTime: string;
};

export type { SDBOutputState };
