import { GDBOutput } from "../../database/types/GDBOutput";
import { IGrowthDB } from "../../database/types/IGrowthDB";

enum ControlMode { 
  manual = 'manual',
  schedule = 'schedule'
};

abstract class OutputBase {
  id: number;
  description: string | null;
  pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  growthDB: IGrowthDB;
  manualState: State;
  scheduleState: State;
  controlMode: ControlMode;

  constructor(gdbOutput: GDBOutput, growthDB: IGrowthDB) {
    this.id = gdbOutput.id;
    this.description = gdbOutput.description;
    this.pin = gdbOutput.pin;
    this.isPwm = gdbOutput.isPwm;
    this.isInvertedPwm = gdbOutput.isPwm ? gdbOutput.isInvertedPwm : false;
    this.growthDB = growthDB;
    this.manualState = { isOn: false, value: 0 }
    this.scheduleState = { isOn: false, value: 0 }
    this.controlMode = ControlMode.schedule;
  }

  /**
   * Updates the control mode for the output; used to switch between manual and schedule modes
   * @param controlMode 
   * @returns 
   */
  updateControlMode = (controlMode: ControlMode) => this.controlMode = controlMode;

  /**
   * Applies a new state to the object. This does NOT immediately execute the state, but merely updates the state object.
   * The executeState() method must be called to actually execute the state, and should be used in conjunction with this to
   * ensure that the recorded state is always in sync with the actual state of the output.
   * @param newState New state to set
   * @param targetControlMode Determines which state will be overwritten
   */
  setNewState(newState: State, targetControlMode: ControlMode){
    switch (targetControlMode) {
      case ControlMode.manual:
        this.manualState = newState;
        break;

      case ControlMode.schedule:
        this.scheduleState = newState;
        break;
    }
  }

  /**
   * Executes the current state of the output, setting the physical state of the output to the recorded state (respecting the current ControlMode).
   * This should be called after setNewState() to ensure that the physical state of the output is always in sync with the recorded state of the output.
   */
  abstract executeState(): void;
  abstract dispose(): void;
}

interface State {
  isOn: boolean;
  value: number;
}

export { OutputBase, ControlMode, State };