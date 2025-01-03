import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { IOutputState, ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

export class OutputState implements IOutputState {
  manual: SDBOutputState;
  automatic: SDBOutputState;
  controlMode: ControlMode;
  #sprootDB: ISprootDB;

  constructor(sprootDB: ISprootDB) {
    this.manual = {
      controlMode: ControlMode.manual,
      value: 0,
      logTime: new Date().toISOString(),
    } as SDBOutputState;
    this.automatic = {
      controlMode: ControlMode.automatic,
      value: 0,
      logTime: new Date().toISOString(),
    } as SDBOutputState;
    this.controlMode = ControlMode.automatic;
    this.#sprootDB = sprootDB;
  }

  get(): SDBOutputState {
    switch (this.controlMode) {
      case ControlMode.manual:
        return this.manual;
      case ControlMode.automatic:
        return this.automatic;
    }
  }

  get value(): number {
    switch (this.controlMode) {
      case ControlMode.manual:
        return this.manual.value;
      case ControlMode.automatic:
        return this.automatic.value;
    }
  }

  get logTime(): string {
    switch (this.controlMode) {
      case ControlMode.manual:
        return this.manual.logTime;
      case ControlMode.automatic:
        return this.automatic.logTime;
    }
  }

  /**
   * Updates the control mode for the output; used to switch between manual and automatic modes
   * @param controlMode Mode to give system control to.
   */
  updateControlMode(controlMode: ControlMode) {
    // this.logger.info(`Output ${this.id} control mode changed to ${controlMode}`);
    this.controlMode = controlMode;
  }

  /**
   * Applies a new state to the object. This does NOT immediately execute the state, but merely updates the state object.
   * The executeState() method must be called to actually execute the state, and should be used in conjunction with this to
   * ensure that the recorded state is always in sync with the actual state of the output. This method rounds numbers below
   * 0 to 0 and above 100 to 100.
   * @param newState New state to set
   * @param targetControlMode Determines which state will be overwritten
   */
  setNewState(newState: SDBOutputState, targetControlMode: ControlMode) {
    newState.value = Math.min(100, Math.max(0, newState.value));
    switch (targetControlMode) {
      case ControlMode.manual:
        this.manual = { ...newState, controlMode: ControlMode.manual };
        break;

      case ControlMode.automatic:
        this.automatic = { ...newState, controlMode: ControlMode.automatic };
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
