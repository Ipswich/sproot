import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";
import { Models } from "./Models";

enum ControlMode {
  manual = "manual",
  automatic = "automatic",
}

interface IOutputBase {
  id: number;
  model: keyof typeof Models;
  subcontrollerId: number | null;
  address: string;
  name: string | null;
  pin: string;
  deviceGroupId: number | null;
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
