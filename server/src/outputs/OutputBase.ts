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

  async publishState(): Promise<void> {
    this.addCurrentStateToCache();
    if (new Date().getMinutes() % 5 == 0) {
      this.updateChartData();
    }
    try {
      await this.state.addCurrentStateToDatabaseAsync(this.id);
    } catch (error) {
      this.logger.error(`Error adding state to database for output ${this.id}: ${error}`);
    }
  }

  protected addCurrentStateToCache(): void {
    this.cache.addData(this.state.get());
    this.logger.info(
      `Updated cached states for output {id: ${this.id}}. Cache Size - ${this.cache.get().length}`,
    );
  }

  async loadCacheFromDatabaseAsync(minutes: number): Promise<void> {
    try {
      await this.cache.loadCacheFromDatabaseAsync(this.id, minutes);
      this.logger.info(
        `Loaded cached states for output {id: ${this.id}}. Cache Size - ${this.cache.get().length}`,
      );
    } catch (err) {
      this.logger.error(`Failed to load cached states for {id: ${this.id}}. ${err}`);
    }
  }

  getCachedReadings(offset?: number, limit?: number): SDBOutputState[] {
    return this.cache.get(offset, limit);
  }

  loadChartData(): void {
    this.chartData.loadChartData(this.cache.get(), this.name);
    this.logger.info(
      `Loaded chart data for output {id: ${this.id}}. Chart data Size - ${this.chartData.get().length}`,
    );
  }

  updateChartData(): void {
    this.chartData.updateChartData(this.cache.get(), this.name);
    this.logger.info(
      `Updated chart data for output {id: ${this.id}}. Chart data Size - ${this.chartData.get().length}`,
    );
    console.table(this.chartData.get().slice(-25));
  }
}

export class OutputState implements IOutputState {
  manual: SDBOutputState;
  schedule: SDBOutputState;
  controlMode: ControlMode;
  #sprootDB: ISprootDB;

  constructor(sprootDB: ISprootDB, _logger: winston.Logger) {
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
      true,
    );
    for (const sdbState of sdbStates) {
      const newState = {
        controlMode: sdbState.controlMode,
        value: sdbState.value,
        logTime: sdbState.logTime,
      } as SDBOutputState;
      this.queueCache.addData(newState);
    }
  }

  addData(state: SDBOutputState, now = new Date()): void {
    if (state.value == undefined) {
      return;
    }

    this.queueCache.addData({
      controlMode: state.controlMode,
      value: state.value,
      logTime: now.toISOString(),
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
      const formattedDate = ChartData.formatDateForChart(state.logTime);
      const value = this.get().find((x) => x.name == formattedDate);
      if (value) {
        value[outputName] = state.value.toString();
      }
    }
  }

  updateChartData(cache: SDBOutputState[], outputName: string): void {
    const lastCacheData = cache[cache.length - 1];
    if (lastCacheData) {
      const name = ChartData.formatDateForChart(lastCacheData.logTime);
      //Add Only if not the same time stamp as the last data point
      if (name != this.chartData.get().slice(-1)[0]?.name) {
        this.chartData.addDataPoint({
          name,
          [outputName]: lastCacheData.value.toString(),
        });
      }
    }
  }
}
