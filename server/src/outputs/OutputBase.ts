import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import {
  IOutputBase,
  IOutputState,
  ControlMode,
} from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { ChartData, DataSeries, IChartable } from "@sproot/sproot-common/dist/utility/IChartable";
import { IQueueCacheable, QueueCache } from "@sproot/sproot-common/dist/utility/QueueCache";
import winston from "winston";

export abstract class OutputBase implements IOutputBase {
  readonly id: number;
  readonly model: string;
  readonly address: string;
  name: string;
  readonly pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  readonly sprootDB: ISprootDB;
  state: OutputState;
  cache: OutputCache;
  chartData: OutputChartData;
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
    this.state = new OutputState(sprootDB, logger);
    this.cache = new OutputCache(Number(process.env["MAX_CACHE_SIZE"]!), sprootDB, logger);
    this.chartData = new OutputChartData(Number(process.env["MAX_CHART_DATA_POINTS"]!));
    this.logger = logger;
  }

  get value(): number {
    return this.state.value;
  }

  get controlMode(): ControlMode {
    return this.state.controlMode;
  }

  /**
   * Executes the current state of the output, setting the physical state of the output to the recorded state
   * (respecting the current ControlMode). This should be called after state.setNewState() to ensure that the
   * physical state of the output is always in sync with the recorded state of the output.
   *
   * See setNewState
   */
  abstract executeState(): void;
  abstract dispose(): void;

  /**
   * Sets a new state to the targeted control mode, and executes it. This keeps the physical state
   * of the output in sync with the logical state.
   * @param newState The new state
   * @param targetControlMode The control mode to apply it to
   */
  setNewState(newState: SDBOutputState, targetControlMode: ControlMode): void {
    this.state.setNewState(newState, targetControlMode);
    this.executeState();
  }

  async loadCacheFromDatabaseAsync(minutes: number): Promise<void> {
    try {
      await this.cache.loadCacheFromDatabaseAsync(this.id, minutes);
      this.logger.info(
        `Loaded cached states for {id: ${this.id}}. Cache Size - ${this.cache.get().length}`,
      );
    } catch (err) {
      this.logger.error(`Failed to load cached states for {id: ${this.id}}. ${err}`);
    }
  }

  protected updateCache(): void {
    this.cache.addData(this.state.get());
    this.logger.info(
      `Updated cached readings for {id: ${this.id}}. Cache Size - ${this.cache.get().length}`,
    );
  }

  getCachedReadings(offset?: number, limit?: number): SDBOutputState[] {
    return this.cache.get(offset, limit);
  }

  loadChartData(): void {
    this.chartData.loadChartData(this.cache.get(), this.name);
  }

  updateChartData(): void {
    this.chartData.updateChartData(this.cache.get(), this.name);
  }
}

export class OutputState implements IOutputState {
  manualState: SDBOutputState;
  scheduleState: SDBOutputState;
  controlMode: ControlMode;
  #sprootDB: ISprootDB;

  constructor(sprootDB: ISprootDB, _logger: winston.Logger) {
    this.manualState = {
      value: 0,
      logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    } as SDBOutputState;
    this.scheduleState = {
      value: 0,
      logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    } as SDBOutputState;
    this.controlMode = ControlMode.schedule;
    this.#sprootDB = sprootDB;
  }

  get(): SDBOutputState {
    switch (this.controlMode) {
      case ControlMode.manual:
        return this.manualState;
      case ControlMode.schedule:
        return this.scheduleState;
    }
  }

  get value(): number {
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
        this.manualState = newState;
        break;

      case ControlMode.schedule:
        this.scheduleState = newState;
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

export class OutputCache implements IQueueCacheable {
  queueCache: QueueCache<SDBOutputState>;
  sprootDB: ISprootDB;
  logger: winston.Logger;
  constructor(maxSize: number, sprootDB: ISprootDB, logger: winston.Logger) {
    this.queueCache = new QueueCache(maxSize);
    this.sprootDB = sprootDB;
    this.logger = logger;
  }

  get(offset?: number, limit?: number): SDBOutputState[] {
    return this.queueCache.get(offset, limit);
  }

  async loadCacheFromDatabaseAsync(outputId: number, minutes: number): Promise<void> {
    this.queueCache.clear();
    const sdbStates = await this.sprootDB.getOutputStatesAsync(
      { id: outputId },
      new Date(),
      minutes,
      false,
    );
    for (const sdbState of sdbStates) {
      const newState = {
        controlMode: sdbState.controlMode,
        value: sdbState.value,
        logTime: sdbState.logTime?.replace(" ", "T") + "Z",
      } as SDBOutputState;
      this.queueCache.addData(newState);
    }
  }

  addData(state: SDBOutputState): void {
    if (state.value == undefined) {
      return;
    }

    this.queueCache.addData({
      controlMode: state.controlMode,
      value: state.value,
      logTime: state.logTime ?? new Date().toISOString().slice(0, 19).replace("T", " "),
    } as SDBOutputState);
  }

  clear(): void {
    this.queueCache.clear();
  }
}

export class OutputChartData implements IChartable {
  chartData: ChartData;
  constructor(limit: number, dataSeries?: DataSeries) {
    this.chartData = new ChartData(limit, dataSeries);
  }
  get(): DataSeries {
    return this.chartData.dataSeries;
  }

  loadChartData(cache: SDBOutputState[], outputName: string): void {
    for (const state of cache) {
      const value = this.get().filter(
        (x) => x.name === ChartData.formatDateForChart(state.logTime),
      );
      if (value[0]) {
        value[0][outputName] = state.value.toString();
      }
    }
  }

  updateChartData(cache: SDBOutputState[], outputName: string): void {
    const lastCacheData = cache[cache.length - 1];
    if (lastCacheData) {
      this.chartData.addDataPoint({
        name: ChartData.formatDateForChart(lastCacheData.logTime),
        [outputName]: lastCacheData.value.toString(),
      });
    }
  }
}
