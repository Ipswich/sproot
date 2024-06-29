import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";

enum ControlMode {
  manual = "manual",
  schedule = "schedule",
}

interface IOutputBase {
  id: number;
  model: string;
  address: string;
  name: string | null;
  pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  color: string | null;
  state: IOutputState;
}

type IOutputState = {
  manual: SDBOutputState;
  schedule: SDBOutputState;
  controlMode: ControlMode;
  value: number;
};

export { ControlMode };
export type { IOutputBase, IOutputState };
