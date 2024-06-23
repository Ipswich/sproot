import { Pca9685Driver } from "pca9685";
import { openSync } from "i2c-bus";
import { IOutputBase, ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";

class PCA9685 {
  #boardRecord: Record<string, Pca9685Driver> = {};
  #outputs: Record<string, PCA9685Output>;
  #sprootDB: ISprootDB;
  #frequency: number;
  #usedPins: Record<string, number[]> = {};
  #maxCacheSize: number;
  #initialCacheLookback: number;
  #maxChartDataSize: number;
  #chartDataPointInterval: number;
  #logger: winston.Logger;

  constructor(
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    frequency: number = 50,
    logger: winston.Logger,
  ) {
    this.#sprootDB = sprootDB;
    this.#maxCacheSize = maxCacheSize;
    this.#initialCacheLookback = initialCacheLookback;
    this.#maxChartDataSize = maxChartDataSize;
    this.#chartDataPointInterval = chartDataPointInterval;
    this.#frequency = frequency;
    this.#logger = logger;
    this.#outputs = {};
  }

  async createOutput(output: SDBOutput): Promise<PCA9685Output | null> {
    //Create new PCA9685 if one doesn't exist for this address.
    if (!this.#boardRecord[output.address]) {
      this.#boardRecord[output.address] = new Pca9685Driver(
        {
          i2c: openSync(1),
          address: parseInt(output.address),
          frequency: this.#frequency,
          debug: false,
        },
        () => {},
      );
      this.#usedPins[output.address] = [];
    }

    const pca9685Driver = this.#boardRecord[output.address];
    if (pca9685Driver) {
      this.#outputs[output.id] = new PCA9685Output(
        pca9685Driver as Pca9685Driver, // Type assertion to ensure pca9685Driver is not undefined
        output,
        this.#sprootDB,
        this.#maxCacheSize,
        this.#initialCacheLookback,
        this.#maxChartDataSize,
        this.#chartDataPointInterval,
        this.#logger,
      );
      await this.#outputs[output.id]?.initializeAsync();
      this.#usedPins[output.address]?.push(output.pin);
      return this.#outputs[output.id]!;
    } else {
      this.#logger.error(`Failed to create PCA9685 {id: ${output.id}}`);
      return null;
    }
  }

  get boardRecord(): Record<string, Pca9685Driver> {
    return this.#boardRecord;
  }
  get outputs(): Record<string, PCA9685Output> {
    return this.#outputs;
  }
  get usedPins(): Record<string, number[]> {
    return this.#usedPins;
  }

  get outputData(): Record<string, IOutputBase> {
    const cleanObject: Record<string, IOutputBase> = {};
    for (const key in this.#outputs) {
      const { id, model, address, name, pin, isPwm, isInvertedPwm, state } = this.#outputs[
        key
      ] as IOutputBase;
      cleanObject[key] = {
        id,
        model,
        address,
        name,
        pin,
        isPwm,
        isInvertedPwm,
        state,
      };
    }
    return cleanObject;
  }

  disposeOutput(output: OutputBase) {
    const usedPins = this.#usedPins[output.address];
    if (usedPins) {
      const index = usedPins.indexOf(this.#outputs[output.id]!.pin);
      if (index !== -1) {
        usedPins.splice(index, 1);
        this.#outputs[output.id]!.dispose();
        delete this.#outputs[output.id];
        if (usedPins.length === 0) {
          this.#boardRecord[output.address]?.dispose();
          delete this.#boardRecord[output.address];
          delete this.#usedPins[output.address];
        }
      }
    }
  }

  updateControlMode = (outputId: string, controlMode: ControlMode) =>
    this.#outputs[outputId]?.state.updateControlMode(controlMode);
  setNewOutputState = (
    outputId: string,
    newState: SDBOutputState,
    targetControlMode: ControlMode,
  ) => this.#outputs[outputId]?.state.setNewState(newState, targetControlMode);
  executeOutputState = (outputId?: string) =>
    outputId
      ? this.#outputs[outputId]?.executeState()
      : Object.keys(this.#outputs).forEach((key) => this.#outputs[key]?.executeState());
}

class PCA9685Output extends OutputBase {
  pca9685: Pca9685Driver;

  constructor(
    pca9685: Pca9685Driver,
    output: SDBOutput,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    super(
      output,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger,
    );
    this.pca9685 = pca9685;
  }

  async initializeAsync(): Promise<void> {
    await this.loadCacheFromDatabaseAsync();
    this.loadChartData();
  }

  executeState(): void {
    switch (this.controlMode) {
      case ControlMode.manual:
        this.logger.verbose(
          `Executing ${this.controlMode} state for ${this.model.toLowerCase()} id: ${this.id}, pin: ${this.pin}. New value: ${this.state.manual.value}`,
        );
        this.#setPwm(this.state.manual.value);
        break;

      case ControlMode.schedule:
        this.logger.verbose(
          `Executing ${this.controlMode} state for ${this.model.toLowerCase()} id: ${this.id}, pin: ${this.pin}. New value: ${this.state.schedule.value}`,
        );
        this.#setPwm(this.state.schedule.value);
        break;
    }
  }

  // Power down pin
  dispose = () => {
    this.pca9685.setDutyCycle(this.pin, 0);
  };

  #setPwm(value: number): void {
    if (!this.isPwm && value != 0 && value != 100) {
      this.logger.error(`Could not set PWM for Output ${this.id}. Output is not a PWM output`);
      return;
    }
    if (value < 0 || value > 100) {
      this.logger.error(
        `Invalid PWM value for Output ${this.id}. PWM value must be between 0 and 100`,
      );
      return;
    }
    const calculatedOutputValue = (this.isInvertedPwm ? 100 - value : value) / 100;
    this.pca9685.setDutyCycle(this.pin, calculatedOutputValue);
  }
}

export { PCA9685, PCA9685Output };
