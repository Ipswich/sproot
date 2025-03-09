import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";

enum ControlMode {
  manual = "manual",
  automatic = "automatic",
}

interface IOutputBase {
  id: number;
  model: string;
  address: string;
  name: string | null;
  pin: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  color: string;
  state: IOutputState;
  automationTimeout: number;
}

type IOutputState = {
  manual: SDBOutputState;
  automatic: SDBOutputState;
  controlMode: ControlMode;
  value: number;
};

export { ControlMode };
export type { IOutputBase, IOutputState };
