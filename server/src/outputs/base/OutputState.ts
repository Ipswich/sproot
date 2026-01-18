import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { IOutputState, ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

export class OutputState implements IOutputState {
  lastValue: number;
  manual: SDBOutputState;
  automatic: SDBOutputState;
  controlMode: ControlMode;
  #outputId: number;
  #sprootDB: ISprootDB;

  constructor(outputId: number, sprootDB: ISprootDB) {
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
    this.lastValue = 0;
    this.#sprootDB = sprootDB;
    this.#outputId = outputId;
  }

  async loadAsync() {
    const lastState = await this.#sprootDB.getLastOutputStateAsync(this.#outputId);
    if (lastState[0]?.controlMode == ControlMode.manual) {
      this.controlMode = ControlMode.manual;
      await this.setNewStateAsync(lastState[0]);
    }
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
    this.lastValue = this.value;
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
  async setNewStateAsync(newState: SDBOutputState) {
    this.lastValue = this.value;
    newState.value = Math.min(100, Math.max(0, newState.value));
    switch (newState.controlMode) {
      case ControlMode.manual:
        this.manual = newState;
        break;
      case ControlMode.automatic:
        this.automatic = newState;
        break;
    }
    await this.updateDatabaseStateAsync();
  }

  /**
   * Updates the last recorded state in the database.
   * This is used for second granularity, as opposed to minute granularity.
   */
  async updateDatabaseStateAsync(): Promise<void> {
    await this.#sprootDB.updateLastOutputStateAsync({
      id: this.#outputId,
      value: this.value,
      controlMode: this.controlMode,
    });
  }

  /**
   * Adds the current state of the output to the database.
   */
  async addCurrentStateToDatabaseAsync(): Promise<void> {
    await this.#sprootDB.addOutputStateAsync({
      id: this.#outputId,
      value: this.value,
      controlMode: this.controlMode,
    });
  }
}
