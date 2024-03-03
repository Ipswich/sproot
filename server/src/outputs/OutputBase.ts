import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { IOutputBase, ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import winston from "winston";
import { IChartable, ChartData } from "../utility/IChartable";

export abstract class OutputBase implements IOutputBase, IChartable {
  readonly id: number;
  readonly model: string;
  readonly address: string;
  name: string;
  readonly pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  readonly sprootDB: ISprootDB;
  manualState: SDBOutputState;
  scheduleState: SDBOutputState;
  controlMode: ControlMode;
  cachedStates: SDBOutputState[];
  chartData: ChartData;
  logger: winston.Logger;

  constructor(sdbOutput: SDBOutput, sprootDB: ISprootDB, logger: winston.Logger) {
    this.id = sdbOutput.id;
    this.model = sdbOutput.model;
    this.address = sdbOutput.address;
    this.name = sdbOutput.name;
    this.pin = sdbOutput.pin;
    this.isPwm = sdbOutput.isPwm;
    this.isInvertedPwm = sdbOutput.isPwm ? sdbOutput.isInvertedPwm : false;
    this.sprootDB = sprootDB;
    this.manualState = {
      value: 0,
      logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    } as SDBOutputState;
    this.scheduleState = {
      value: 0,
      logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    } as SDBOutputState;
    this.controlMode = ControlMode.schedule;
    this.cachedStates = [];
    this.chartData = new ChartData(Number(process.env["MAX_CACHE_SIZE"]!));
    this.logger = logger;
  }

  get value(): number | undefined {
    switch (this.controlMode) {
      case ControlMode.manual:
        return this.manualState.value;
      case ControlMode.schedule:
        return this.scheduleState.value;
    }
  }

  /**
   * Updates the control mode for the output; used to switch between manual and schedule modes
   * @param controlMode Mode to give system control to.
   */
  updateControlMode = (controlMode: ControlMode) => {
    this.logger.info(`Output ${this.id} control mode changed to ${controlMode}`);
    this.controlMode = controlMode;
  };

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
        this.manualState = newState;
        break;

      case ControlMode.schedule:
        this.scheduleState = newState;
        break;
    }
  }

  async addLastStateToDatabase(): Promise<void> {
    this.updateCachedReadings();
    try {
      await this.sprootDB.addOutputStateAsync(this);
    } catch (err) {
      this.logger.error(
        `Failed to add last state to database for {${this.constructor.name}, id: ${this.id}}. ${err}`,
      );
    }
  }

  /**
   * Executes the current state of the output, setting the physical state of the output to the recorded state (respecting the current ControlMode).
   * This should be called after setNewState() to ensure that the physical state of the output is always in sync with the recorded state of the output.
   */
  abstract executeState(): void;
  abstract dispose(): void;

  protected async loadCachedStatesFromDatabaseAsync(minutes: number): Promise<void> {
    try {
      this.cachedStates = [];
      const sdbStates = await this.sprootDB.getOutputStatesAsync(this, new Date(), minutes, false);
      for (const sdbState of sdbStates) {
        this.cachedStates.push({
          value: sdbState.value!,
          logTime: sdbState.logTime?.replace(" ", "T") + "Z",
        } as SDBOutputState);
      }
      this.logger.info(
        `Loaded cached states for {${this.constructor.name}, id: ${this.id}}. Cache Size - ${this.cachedStates.length}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to load cached states for {${this.constructor.name}, id: ${this.id}}. ${err}`,
      );
    }
  }

  protected updateCachedReadings(): void {
    if (this.value == undefined) {
      return;
    }

    this.cachedStates.push({
      value: this.value,
      logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    } as SDBOutputState);

    while (this.cachedStates.length > Number(process.env["MAX_CACHE_SIZE"]!)) {
      this.cachedStates.shift();
    }
    this.logger.info(
      `Updated cached readings for {${this.constructor.name}, id: ${this.id}}. Cache Size - ${this.cachedStates.length}`,
    );
  }

  getCachedReadings(offset?: number, limit?: number): SDBOutputState[] {
    if (offset == undefined || offset == null || limit == undefined || limit == null) {
      return this.cachedStates;
    }
    if (offset < 0 || limit < 1 || offset > this.cachedStates.length) {
      return [];
    }

    return this.cachedStates.slice(offset, offset + limit);
  }

  loadChartData(): void {
    for (const state of this.cachedStates) {
      this.chartData.addDataPoint({
        name: ChartData.formatDateForChart(state.logTime),
        [this.name]: ChartData.formatReadingForDisplay(state.value.toString()),
      });
    }
  }

  updateChartData(): void {
    this.chartData.addDataPoint({
      name: ChartData.formatDateForChart(new Date()),
      [this.name]: ChartData.formatReadingForDisplay(this.value!.toString()),
    });
  }
}