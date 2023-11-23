import { Pca9685Driver } from "pca9685";
import { openSync } from "i2c-bus";
import {
  IOutputBase,
  OutputBase,
  ControlMode,
  IState,
} from "@sproot/sproot-common/dist/outputs/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";

class PCA9685 {
  #boardRecord: Record<string, Pca9685Driver> = {};
  #outputs: Record<string, PCA9685Output>;
  #sprootDB: ISprootDB;
  #frequency: number;
  #usedPins: Record<string, number[]> = {};
  #logger: winston.Logger;
  constructor(sprootDB: ISprootDB, logger: winston.Logger, frequency: number = 50) {
    this.#sprootDB = sprootDB;
    this.#outputs = {};
    this.#frequency = frequency;
    this.#logger = logger;
  }

  createOutput(output: SDBOutput): PCA9685Output | null {
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
        this.#logger,
      );
      this.#usedPins[output.address]?.push(output.pin);
      return this.#outputs[output.id]!;
    } else {
      this.#logger.error(
        `Failed to create PCA9685 {id: ${output.id}}`,
      );
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
      const {
        id,
        model,
        address,
        description,
        pin,
        isPwm,
        isInvertedPwm,
        manualState,
        scheduleState,
        controlMode,
      } = this.#outputs[key] as IOutputBase;
      cleanObject[key] = {
        id,
        model,
        address,
        description,
        pin,
        isPwm,
        isInvertedPwm,
        manualState,
        scheduleState,
        controlMode,
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
    this.#outputs[outputId]?.updateControlMode(controlMode);
  setNewOutputState = (outputId: string, newState: PCA9685State, targetControlMode: ControlMode) =>
    this.#outputs[outputId]?.setNewState(newState, targetControlMode);
  executeOutputState = (outputId?: string) =>
    outputId
      ? this.#outputs[outputId]?.executeState()
      : Object.keys(this.#outputs).forEach((key) => this.#outputs[key]?.executeState());
}

class PCA9685Output extends OutputBase {
  pca9685: Pca9685Driver;
  override manualState: PCA9685State;
  override scheduleState: PCA9685State;

  constructor(
    pca9685: Pca9685Driver,
    output: SDBOutput,
    sprootDB: ISprootDB,
    logger: winston.Logger,
  ) {
    super(output, sprootDB, logger);
    this.pca9685 = pca9685;
    this.manualState = { value: 0 };
    this.scheduleState = { value: 0 };
  }

  executeState(): void {
    this.logger.verbose(
      `Executing ${this.controlMode} state for ${this.model} ${this.id}, pin ${this.pin}. New value: ${this.manualState.value}`,
    );
    switch (this.controlMode) {
      case ControlMode.manual:
        this.#setPwm(this.manualState.value);
        break;

      case ControlMode.schedule:
        this.#setPwm(this.scheduleState.value);
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

interface PCA9685State extends IState {
  value: number;
}

export { PCA9685, PCA9685Output };
export type { PCA9685State };
