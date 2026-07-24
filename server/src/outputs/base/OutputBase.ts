import { ISprootDB } from "@sproot/common/dist/database/ISprootDB";
import { SDBOutput } from "@sproot/common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/common/dist/database/SDBOutputState";
import { IOutputBase, ControlMode } from "@sproot/common/dist/outputs/IOutputBase";
import { OutputCache } from "./OutputCache";
import winston from "winston";
import { OutputState } from "./OutputState";
import { OutputActionManager } from "../../automation/outputs/OutputActionManager";
import { Models } from "@sproot/common/dist/outputs/Models";
import { toDbDate } from "../../utils/dateUtils";
import { IEventBus } from "../../eventbus/IEventBus";

export abstract class OutputBase implements IOutputBase, AsyncDisposable {
  readonly id: number;
  readonly model: keyof typeof Models;
  subcontrollerId: number | null = null;
  readonly address: string;
  readonly pin: string;
  deviceZoneId: number | null;
  parentOutputId: number | null;
  name: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  state: OutputState;
  color: string;
  automationTimeout: number;
  readonly eventBus: IEventBus;
  readonly sprootDB: ISprootDB;
  readonly logger: winston.Logger;
  #cache: OutputCache;
  #initialCacheLookback: number;
  #cacheBucketMinutes: number;
  #actionManager: OutputActionManager | null = null;
  #isExecuting = false;

  constructor(
    sdbOutput: SDBOutput,
    eventBus: IEventBus,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ) {
    this.id = sdbOutput.id;
    this.model = sdbOutput.model;
    this.subcontrollerId = sdbOutput.subcontrollerId;
    this.address = sdbOutput.address;
    this.pin = sdbOutput.pin;
    this.deviceZoneId = sdbOutput.deviceZoneId;
    this.parentOutputId = sdbOutput.parentOutputId;
    this.name = sdbOutput.name;
    this.isPwm = sdbOutput.isPwm ? true : false;
    this.isInvertedPwm = sdbOutput.isPwm && sdbOutput.isInvertedPwm ? true : false;
    this.state = new OutputState(sdbOutput.id, sprootDB);
    this.color = sdbOutput.color;
    this.automationTimeout = sdbOutput.automationTimeout;
    this.eventBus = eventBus;
    this.sprootDB = sprootDB;
    this.logger = logger;
    this.#cache = new OutputCache(maxCacheSize, sprootDB, logger);
    this.#initialCacheLookback = initialCacheLookback;
    this.#cacheBucketMinutes = cacheBucketMinutes;
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
      subcontrollerId,
      address,
      name,
      pin,
      deviceZoneId,
      parentOutputId,
      isPwm,
      isInvertedPwm,
      color,
      state,
      automationTimeout,
    } = this;
    return {
      id,
      model,
      subcontrollerId,
      address,
      name,
      pin,
      deviceZoneId,
      parentOutputId,
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
  abstract executeStateAsync(forceExecution?: boolean): Promise<void>;

  /**
   * Dispose of the output, cleaning up event listeners.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    // Remove event listener to prevent memory leaks
    const actionManager = this.#actionManager;
    if (actionManager != null) {
      actionManager[Symbol.dispose]();
      this.#actionManager = null;
    }
  }

  /**
   * Initialize the output, including creating the action manager and registering as an event listener.
   */
  protected async initializeAsync(): Promise<this> {
    await this.state.loadAsync();
    await this.loadCacheFromDatabaseAsync();
    this.#actionManager = await OutputActionManager.createInstanceAsync(
      this.parentOutputId ?? this.id,
      this.#actionFunctionWrapperAsync.bind(this),
      this.eventBus,
      this.sprootDB,
      this.logger,
      this.automationTimeout,
    );

    return this;
  }

  updateName(name: string): void {
    this.name = name;
  }

  updateColor(color: string): void {
    this.color = color;
  }

  updateAutomationTimeout(timeoutSeconds: number): void {
    this.automationTimeout = timeoutSeconds;
    if (this.#actionManager) {
      this.#actionManager.automationTimeout = timeoutSeconds;
    }
  }

  updateParentOutputId(parentOutputId: number | null): void {
    this.parentOutputId = parentOutputId;
    if (this.#actionManager) {
      this.#actionManager.outputId = parentOutputId ?? this.id;
    }
  }

  /**
   * Sets a new state to the targeted control mode, and executes it. This keeps the physical state
   * of the output in sync with the logical state.
   * @param newState The new state
   * @param targetControlMode The control mode to apply it to
   */
  async setAndExecuteStateAsync(newState: SDBOutputState): Promise<void> {
    await this.setStateAsync(newState);
    await this.executeStateAsync();
  }

  async setStateAsync(newState: SDBOutputState): Promise<void> {
    const tempState = { ...newState };
    // Normalize non-PWM outputs to only allow 0 or 100
    if (!this.isPwm) {
      if (tempState.value > 0 && tempState.value < 100) {
        tempState.value = 100;
      }
    }
    await this.state.setNewStateAsync(tempState);
  }

  getCachedReadings(offset?: number, limit?: number): SDBOutputState[] {
    return this.#cache.get(offset, limit);
  }

  async updateDataStoresAsync(): Promise<void> {
    this.addCurrentStateToCache();

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

  protected addCurrentStateToCache(): void {
    this.#cache.addData(this.state.get());
    this.logger.info(
      `Updated cached states for output {id: ${this.id}}. Cache size - ${this.#cache.get().length}`,
    );
  }

  protected async loadCacheFromDatabaseAsync(): Promise<void> {
    try {
      await this.#cache.loadFromDatabaseAsync(
        this.id,
        this.#initialCacheLookback,
        this.#cacheBucketMinutes,
      );
      this.logger.info(
        `Loaded cached states for output {id: ${this.id}}. Cache size - ${this.#cache.get().length}`,
      );
    } catch (err) {
      this.logger.error(`Failed to load cached states for {id: ${this.id}}. ${err}`);
    }
  }

  protected async executeStateHelperAsync(
    executionFnAsync: (value: number) => Promise<void>,
    forceExecution: boolean,
  ): Promise<void> {
    if (!forceExecution) {
      if (this.#isExecuting) {
        this.logger.verbose(
          `Output { Model: ${this.model}, id: ${this.id} } is already updating. Skipping state execution.`,
        );
        return;
      }
      if (this.value == this.state.lastValue) {
        return;
      }
    }
    const rewindValue = this.state.lastValue;
    try {
      const validatedValue = this.#validateAndFixValue(this.value);
      this.#isExecuting = true;
      if (validatedValue === undefined) {
        return undefined;
      }
      this.logger.verbose(
        `Executing ${this.controlMode} state for ${this.model.toLowerCase()} id: ${this.id}, pin: ${this.pin}. New value: ${validatedValue}`,
      );
      this.state.updateLastState();
      await executionFnAsync(validatedValue);
    } catch (error) {
      // Rewind state on error to ensure consistency
      this.state.updateLastState(rewindValue);
      this.logger.error(`Error executing state for output ${this.id} - ${error}`);
    } finally {
      this.#isExecuting = false;
    }
  }

  async #actionFunctionWrapperAsync(actionValue: number | undefined): Promise<void> {
    if (actionValue === undefined) {
      return; // No action to take (output in timeout)
    }

    await this.setStateAsync({
      value: actionValue ?? 0, // default to off if no action or collision
      controlMode: ControlMode.automatic,
      logTime: toDbDate(),
    } as SDBOutputState);

    if (this.controlMode === ControlMode.automatic) {
      await this.executeStateAsync();
    }
  }

  #validateAndFixValue(value: number): number | undefined {
    if (!this.isPwm && value != 0 && value != 100) {
      this.logger.error(`Could not set PWM for Output ${this.id}. Output is not a PWM output`);
      return;
    }
    return this.isInvertedPwm ? 100 - value : value;
  }
}
