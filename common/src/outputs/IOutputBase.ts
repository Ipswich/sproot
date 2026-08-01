import { SDBOutputState } from "../database/SDBOutputState";
import { OutputActionPrecedence } from "../automation/OutputActionPrecedence";
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
  deviceZoneId: number | null;
  parentOutputId: number | null;
  isPwm: boolean;
  isInvertedPwm: boolean;
  color: string;
  state: IOutputState;
  automationTimeout: number;
  actionWarnings: OutputActionWarning[];
  activeConflict: OutputActionConflict | null;
}

type IOutputState = {
  manual: SDBOutputState;
  automatic: SDBOutputState;
  controlMode: ControlMode;
  value: number;
};

type OutputActionParticipant = {
  automationId: number;
  automationName: string;
};

type OutputActionWarning = {
  precedence: OutputActionPrecedence;
  actions: OutputActionParticipant[];
};

type OutputActionConflict = {
  precedence: OutputActionPrecedence;
  actions: Array<
    OutputActionParticipant & {
      value: number;
    }
  >;
};

export { ControlMode };
export type {
  IOutputBase,
  IOutputState,
  OutputActionConflict,
  OutputActionParticipant,
  OutputActionWarning,
};
