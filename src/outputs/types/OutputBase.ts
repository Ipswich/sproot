import { SDBOutput } from "../../database/types/SDBOutput";
import { ISprootDB } from "../../database/types/ISprootDB";

enum ControlMode {
  manual = "manual",
  schedule = "schedule",
}

interface IOutputBase {
  id: number;
  model: string;
  address: string;
  description: string | null;
  pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  manualState: IState;
  scheduleState: IState;
  controlMode: ControlMode;
}

abstract class OutputBase implements IOutputBase {
  readonly id: number;
  readonly model: string;
  readonly address: string;
  description: string | null;
  readonly pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  readonly sprootDB: ISprootDB;
  manualState: IState;
  scheduleState: IState;
  controlMode: ControlMode;

  constructor(sdbOutput: SDBOutput, sprootDB: ISprootDB) {
    this.id = sdbOutput.id;
    this.model = sdbOutput.model;
    this.address = sdbOutput.address;
    this.description = sdbOutput.description;
    this.pin = sdbOutput.pin;
    this.isPwm = sdbOutput.isPwm;
    this.isInvertedPwm = sdbOutput.isPwm ? sdbOutput.isInvertedPwm : false;
    this.sprootDB = sprootDB;
    this.manualState = {};
    this.scheduleState = {};
    this.controlMode = ControlMode.schedule;
  }

  /**
   * Updates the control mode for the output; used to switch between manual and schedule modes
   * @param controlMode Mode to give system control to.
   */
  updateControlMode = (controlMode: ControlMode) =>
    (this.controlMode = controlMode);

  /**
   * Applies a new state to the object. This does NOT immediately execute the state, but merely updates the state object.
   * The executeState() method must be called to actually execute the state, and should be used in conjunction with this to
   * ensure that the recorded state is always in sync with the actual state of the output.
   * @param newState New state to set
   * @param targetControlMode Determines which state will be overwritten
   */
  setNewState(newState: IState, targetControlMode: ControlMode) {
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

interface IState {}

export { IOutputBase, OutputBase, ControlMode, IState };
