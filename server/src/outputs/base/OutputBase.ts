import { ISprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
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

export abstract class OutputBase implements IOutputBase {
  readonly id: number;
  readonly model: string;
  readonly address: string;
  readonly pin: number;
  name: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  state: OutputState;
  color: string;
  readonly sprootDB: ISprootDB;
  readonly logger: winston.Logger;
  #cache: OutputCache;
  #initialCacheLookback: number;
  #chartData: OutputChartData;
  #chartDataPointInterval: number;
  #automationManager: OutputAutomationManager;

  #updateMissCount = 0;

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
    this.address = sdbOutput.address;
    this.pin = sdbOutput.pin;
    this.name = sdbOutput.name;
    this.isPwm = sdbOutput.isPwm ? true : false;
    this.isInvertedPwm = sdbOutput.isPwm && sdbOutput.isInvertedPwm ? true : false;
    this.state = new OutputState(sprootDB);
    this.color = sdbOutput.color;
    this.sprootDB = sprootDB;
    this.logger = logger;
    this.#cache = new OutputCache(maxCacheSize, sprootDB, logger);
    this.#chartData = new OutputChartData(maxChartDataSize, chartDataPointInterval);
    this.#automationManager = new OutputAutomationManager(sprootDB);
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
    const { id, model, address, name, pin, isPwm, isInvertedPwm, color, state } = this;
    return {
      id,
      model,
      address,
      name,
      pin,
      isPwm,
      isInvertedPwm,
      color,
      state,
    };
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

  /** Initializes all of the data for this output */
  async initializeAsync() {
    await this.loadCacheFromDatabaseAsync();
    this.loadChartData();
    await this.loadAutomationsAsync();
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
  setNewState(newState: SDBOutputState, targetControlMode: ControlMode): void {
    this.state.setNewState(newState, targetControlMode);
    this.executeState();
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
      await this.state.addCurrentStateToDatabaseAsync(this.id);
    } catch (error) {
      this.logger.error(`Error adding state to database for output ${this.id}: ${error}`);
    }
  }

  runAutomations(sensorList: SensorList, outputList: OutputList, now: Date): void {
    const result = this.#automationManager.evaluate(sensorList, outputList, now);
    if (result.value != null) {
      this.state.setNewState(
        {
          value: result.value,
          controlMode: ControlMode.automatic,
          logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
        } as SDBOutputState,
        ControlMode.automatic,
      );
    } else {
      this.state.setNewState(
        {
          value: 0,
          controlMode: ControlMode.automatic,
          logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
        } as SDBOutputState,
        ControlMode.automatic,
      );
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

  async loadAutomationsAsync(): Promise<void> {
    await this.#automationManager.loadAsync(this.id);
  }

  protected executeStateHelper(executionFn: (value: number) => void): void {
    //Local helper function
    const validateAndFixValue = (value: number) => {
      if (!this.isPwm && value != 0 && value != 100) {
        this.logger.error(`Could not set PWM for Output ${this.id}. Output is not a PWM output`);
        return;
      }
      const validatedValue = (this.isInvertedPwm ? 100 - value : value) / 100;
      this.logger.verbose(
        `Executing ${this.controlMode} state for ${this.model.toLowerCase()} id: ${this.id}, pin: ${this.pin}. New value: ${validatedValue * 100}`,
      );
      return validatedValue;
    };

    let validatedValue = undefined;
    switch (this.controlMode) {
      case ControlMode.manual:
        validatedValue = validateAndFixValue(this.state.manual.value);
        return validatedValue != undefined ? executionFn(validatedValue) : undefined;
      case ControlMode.automatic:
        validatedValue = validateAndFixValue(this.state.automatic.value);
        return validatedValue != undefined ? executionFn(validatedValue) : undefined;
    }
  }

  #updateChartData(): void {
    this.#chartData.updateChartData(this.#cache.get(), this.name);
    this.logger.info(
      `Updated chart data for output {id: ${this.id}}. Chart data size - ${this.#chartData.get().data.length}`,
    );
  }
}
