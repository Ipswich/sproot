import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { IOutputBase, ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { OutputCache } from "./OutputCache";
import { OutputChartData } from "./OutputChartData";
import winston from "winston";
import { OutputState } from "./OutputState";
import { DataSeries, ChartSeries } from "@sproot/utility/ChartData";
import OutputAutomationManager from "../../automation/outputs/OutputAutomationManager";
import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../list/OutputList";
import { OutputAutomation } from "../../automation/outputs/OutputAutomation";
import { Models } from "@sproot/sproot-common/dist/outputs/Models";

export abstract class OutputBase implements IOutputBase, AsyncDisposable {
  readonly id: number;
  readonly model: keyof typeof Models;
  readonly externalAddress: string | null;
  readonly address: string;
  readonly pin: string;
  name: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  state: OutputState;
  color: string;
  automationTimeout: number;
  readonly sprootDB: ISprootDB;
  readonly logger: winston.Logger;
  #cache: OutputCache;
  #initialCacheLookback: number;
  #chartData: OutputChartData;
  #chartDataPointInterval: number;
  #automationManager: OutputAutomationManager;
  #updateMissCount = 0;
  #isExecuting = false;

  constructor(
    sdbOutput: SDBOutput,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    this.id = sdbOutput.id;
    this.model = sdbOutput.model;
    this.externalAddress = sdbOutput.externalAddress;
    this.address = sdbOutput.address;
    this.pin = sdbOutput.pin;
    this.name = sdbOutput.name;
    this.isPwm = sdbOutput.isPwm ? true : false;
    this.isInvertedPwm = sdbOutput.isPwm && sdbOutput.isInvertedPwm ? true : false;
    this.state = new OutputState(sdbOutput.id, sprootDB);
    this.color = sdbOutput.color;
    this.automationTimeout = sdbOutput.automationTimeout;
    this.sprootDB = sprootDB;
    this.logger = logger;
    this.#cache = new OutputCache(maxCacheSize, sprootDB, logger);
    this.#chartData = new OutputChartData(maxChartDataSize, chartDataPointInterval);
    this.#automationManager = new OutputAutomationManager(sprootDB, logger);
    this.#chartDataPointInterval = Number(chartDataPointInterval);
    this.#initialCacheLookback = initialCacheLookback;
  }

  get value(): number {
    return this.state.value;
  }

  get controlMode(): ControlMode {
    return this.state.controlMode;
  }

  get outputData(): IOutputBase {
    const {
      id,
      model,
      externalAddress,
      address,
      name,
      pin,
      isPwm,
      isInvertedPwm,
      color,
      state,
      automationTimeout,
    } = this;
    return {
      id,
      model,
      externalAddress,
      address,
      name,
      pin,
      isPwm,
      isInvertedPwm,
      color,
      state,
      automationTimeout,
    };
  }

  /**
   * Executes the current state of the output, setting the physical state of the output to the recorded state
   * (respecting the current ControlMode).
   */
  abstract executeStateAsync(): Promise<void>;
  abstract [Symbol.asyncDispose](): Promise<void>;

  /** Initializes all of the data for this output */
  async initializeAsync() {
    await this.state.initializeAsync();
    await this.loadCacheFromDatabaseAsync();
    this.loadChartData();
    await this.#automationManager.loadAsync(this.id);
  }

  updateName(name: string): void {
    this.name = name;
    this.loadChartData();
  }

  updateColor(color: string): void {
    this.color = color;
    this.loadChartData();
  }

  /**
   * Sets a new state to the targeted control mode, and executes it. This keeps the physical state
   * of the output in sync with the logical state.
   * @param newState The new state
   * @param targetControlMode The control mode to apply it to
   */
  async setAndExecuteStateAsync(newState: SDBOutputState): Promise<void> {
    await this.state.setNewStateAsync(newState);
    await this.executeStateAsync();
  }

  async setStateAsync(newState: SDBOutputState): Promise<void> {
    await this.state.setNewStateAsync(newState);
  }

  getCachedReadings(offset?: number, limit?: number): SDBOutputState[] {
    return this.#cache.get(offset, limit);
  }

  getChartData(): {
    data: DataSeries;
    series: ChartSeries;
  } {
    return this.#chartData.get();
  }

  getAutomations(): Record<string, OutputAutomation> {
    return this.#automationManager.automations;
  }

  async updateDataStoresAsync(): Promise<void> {
    this.addCurrentStateToCache();
    const lastCacheData = this.#cache.get().slice(-1)[0];
    //Only update chart if the most recent datapoint is N minutes after last cache
    if (this.#chartData.shouldUpdateChartData(lastCacheData)) {
      this.#updateChartData();
      //Reset miss count if successful
      this.#updateMissCount = 0;
    } else {
      //Increment miss count if unsuccessful. Easy CYA if things get out of sync.
      this.#updateMissCount++;
      //If miss count exceeds 3 * N, force update (3 real tries, because intervals).
      if (this.#updateMissCount >= 3 * this.#chartDataPointInterval) {
        this.logger.warn(
          `Chart data update miss count exceeded (3) for output {id: ${this.id}}. Forcing update to re-sync.`,
        );
        this.#updateChartData();
        this.#updateMissCount = 0;
      }
    }

    try {
      await this.state.addCurrentStateToDatabaseAsync();
    } catch (error) {
      this.logger.error(`Error adding state to database for output ${this.id}: ${error}`);
    }
  }

  async updateControlModeAsync(controlMode: ControlMode): Promise<void> {
    this.state.updateControlMode(controlMode);
    await this.executeStateAsync();
  }

  async runAutomationsAsync(
    sensorList: SensorList,
    outputList: OutputList,
    now: Date,
  ): Promise<void> {
    await this.#automationManager.loadAsync(this.id);
    const result = this.#automationManager.evaluate(
      sensorList,
      outputList,
      this.automationTimeout,
      now,
    );
    if (result.value != null) {
      await this.state.setNewStateAsync({
        value: result.value,
        controlMode: ControlMode.automatic,
        logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      } as SDBOutputState);
    } else {
      await this.state.setNewStateAsync({
        value: 0,
        controlMode: ControlMode.automatic,
        logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      } as SDBOutputState);
    }

    if (this.controlMode === ControlMode.automatic) {
      await this.executeStateAsync();
    }
  }

  protected addCurrentStateToCache(): void {
    this.#cache.addData(this.state.get());
    this.logger.info(
      `Updated cached states for output {id: ${this.id}}. Cache size - ${this.#cache.get().length}`,
    );
  }

  protected async loadCacheFromDatabaseAsync(): Promise<void> {
    try {
      await this.#cache.loadFromDatabaseAsync(this.id, this.#initialCacheLookback);
      this.logger.info(
        `Loaded cached states for output {id: ${this.id}}. Cache size - ${this.#cache.get().length}`,
      );
    } catch (err) {
      this.logger.error(`Failed to load cached states for {id: ${this.id}}. ${err}`);
    }
  }

  protected loadChartData(): void {
    this.#chartData.loadChartData(this.#cache.get(), this.name);
    this.#chartData.loadChartSeries({ name: this.name, color: this.color });
    this.logger.info(
      `Loaded chart data for output {id: ${this.id}}. Chart data size - ${this.#chartData.get().data.length}`,
    );
  }

  protected async executeStateHelperAsync(
    executionFnAsync: (value: number) => Promise<void>,
    forceExecution: boolean,
  ): Promise<void> {
    if (!forceExecution) {
      if (this.#isExecuting) {
        this.logger.warn(
          `Output { Model: ${this.model}, id: ${this.id} } is already updating. Skipping state execution.`,
        );
        return;
      }
      if (this.value == this.state.lastValue) {
        // this.logger.verbose(
        //   `Output { Model: ${this.model}, id: ${this.id} } value has not changed. Skipping state execution.`,
        // );
        return;
      }
    }

    try {
      const validatedValue = this.#validateAndFixValue(this.value);
      this.#isExecuting = true;
      if (validatedValue === undefined) {
        return undefined;
      }
      this.logger.verbose(
        `Executing ${this.controlMode} state for ${this.model.toLowerCase()} id: ${this.id}, pin: ${this.pin}. New value: ${validatedValue}`,
      );
      await executionFnAsync(validatedValue);
    } catch (error) {
      this.logger.error(`Error executing state for output ${this.id} - ${error}`);
    } finally {
      this.#isExecuting = false;
    }
  }

  #validateAndFixValue(value: number): number | undefined {
    if (!this.isPwm && value != 0 && value != 100) {
      this.logger.error(`Could not set PWM for Output ${this.id}. Output is not a PWM output`);
      return;
    }
    return this.isInvertedPwm ? 100 - value : value;
  }

  #updateChartData(): void {
    this.#chartData.updateChartData(this.#cache.get(), this.name);
    this.logger.info(
      `Updated chart data for output {id: ${this.id}}. Chart data size - ${this.#chartData.get().data.length}`,
    );
  }
}
