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
  manualState: SDBOutputState;
  scheduleState: SDBOutputState;
  controlMode: ControlMode;
  cachedStates: SDBOutputState[];
}

export { ControlMode };
export type { IOutputBase };
