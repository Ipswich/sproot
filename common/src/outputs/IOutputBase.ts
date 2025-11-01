import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";
import { Models } from "./Models";

enum ControlMode {
  manual = "manual",
  automatic = "automatic",
}

interface IOutputBase {
  id: number;
  model: keyof typeof Models;
  hostName: string | null;
  address: string;
  name: string | null;
  pin: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  color: string;
  state: IOutputState;
  automationTimeout: number;
  secureToken: string | null;
  externalDeviceName: string | null;
}

type IOutputState = {
  manual: SDBOutputState;
  automatic: SDBOutputState;
  controlMode: ControlMode;
  value: number;
};

export { ControlMode };
export type { IOutputBase, IOutputState };
