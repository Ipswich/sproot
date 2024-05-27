import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { IOutputState, ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

export class OutputState implements IOutputState {
  manual: SDBOutputState;
  schedule: SDBOutputState;
  controlMode: ControlMode;
  #sprootDB: ISprootDB;

  constructor(sprootDB: ISprootDB) {
    this.manual = {
      controlMode: ControlMode.manual,
      value: 0,
      logTime: new Date().toISOString(),
    } as SDBOutputState;
    this.schedule = {
      controlMode: ControlMode.schedule,
      value: 0,
      logTime: new Date().toISOString(),
    } as SDBOutputState;
    this.controlMode = ControlMode.schedule;
    this.#sprootDB = sprootDB;
  }

  get(): SDBOutputState {
    switch (this.controlMode) {
      case ControlMode.manual:
        return this.manual;
      case ControlMode.schedule:
        return this.schedule;
    }
  }

  get value(): number {
    switch (this.controlMode) {
      case ControlMode.manual:
        return this.manual.value;
      case ControlMode.schedule:
        return this.schedule.value;
    }
  }

  get logTime(): string {
    switch (this.controlMode) {
      case ControlMode.manual:
        return this.manual.logTime;
      case ControlMode.schedule:
        return this.schedule.logTime;
    }
  }

  /**
   * Updates the control mode for the output; used to switch between manual and schedule modes
   * @param controlMode Mode to give system control to.
   */
  updateControlMode(controlMode: ControlMode) {
    // this.logger.info(`Output ${this.id} control mode changed to ${controlMode}`);
    this.controlMode = controlMode;
  }

  /**
   * Applies a new state to the object. This does NOT immediately execute the state, but merely updates the state object.
   * The executeState() method must be called to actually execute the state, and should be used in conjunction with this to
   * ensure that the recorded state is always in sync with the actual state of the output.
   * @param newState New state to set
   * @param targetControlMode Determines which state will be overwritten
   */
  setNewState(newState: SDBOutputState, targetControlMode: ControlMode) {
    switch (targetControlMode) {
      case ControlMode.manual:
        this.manual = { ...newState, controlMode: ControlMode.manual };
        break;

      case ControlMode.schedule:
        this.schedule = { ...newState, controlMode: ControlMode.schedule };
        break;
    }
  }

  /**
   * Adds the current state of the output to the database.
   */
  async addCurrentStateToDatabaseAsync(outputId: number): Promise<void> {
    await this.#sprootDB.addOutputStateAsync({
      id: outputId,
      value: this.value,
      controlMode: this.controlMode,
    });
  }
}
