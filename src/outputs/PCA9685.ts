import { Pca9685Driver } from "pca9685";
import { openSync } from "i2c-bus";
import {
  IOutputBase,
  OutputBase,
  ControlMode,
  IState,
} from "./types/OutputBase";
import { SDBOutput } from "../database/types/SDBOutput";
import { ISprootDB } from "../database/types/ISprootDB";

class PCA9685 {
  #pca9685: Pca9685Driver | undefined;
  #outputs: Record<string, PCA9685Output>;
  #sprootDB: ISprootDB;
  #address: number;
  #frequency: number;
  #usedPins: number[] = [];
  constructor(sprootDB: ISprootDB, address = 0x40) {
    this.#sprootDB = sprootDB;
    this.#outputs = {};
    this.#address = address;
    this.#frequency = 50;
  }

  async initializeOrRegenerateAsync(): Promise<PCA9685> {
    if (!this.#pca9685) {
      this.#pca9685 = new Pca9685Driver(
        {
          i2c: openSync(1),
          address: this.#address,
          frequency: this.#frequency,
          debug: false,
        },
        () => {},
      );
    }
    const outputsFromDatabase = await this.#sprootDB.getOutputsAsync();

    //Update old ones
    outputsFromDatabase.forEach(async (output) => {
      const key = Object.keys(this.#outputs).find(
        (key) => key === output.id.toString(),
      );
      if (key) {
        this.#outputs[key]!.description = output.description;
        this.#outputs[key]!.isPwm = output.isPwm;
        this.#outputs[key]!.isInvertedPwm = output.isInvertedPwm;
      }
    });

    //Add new ones
    const filteredOutputsFromDatabase = outputsFromDatabase.filter(
      (output) => !Object.keys(this.#outputs).includes(String(output.id)),
    );
    for (const output of filteredOutputsFromDatabase) {
      if (
        output.pin >= 0 &&
        output.pin <= 15 &&
        !this.#usedPins.includes(output.pin)
      ) {
        this.#outputs[output.id] = new PCA9685Output(
          this.#pca9685,
          output,
          this.#sprootDB,
        );
        this.#usedPins.push(output.pin);
      } else {
        throw new UsedOrInvalidPinError(
          `Pin ${output.pin} is already in use or is invalid`,
        );
      }
    }

    //Remove deleted ones
    const outputIdsFromDatabase = outputsFromDatabase.map((output) =>
      output.id.toString(),
    );
    for (const key in this.#outputs) {
      if (!outputIdsFromDatabase.includes(key)) {
        this.#usedPins.splice(
          this.#usedPins.indexOf(this.#outputs[key]!.pin),
          1,
        );
        this.#outputs[key]?.dispose();
        delete this.#outputs[key];
      }
    }
    return this;
  }

  get outputs(): Record<string, PCA9685Output> {
    return this.#outputs;
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

  updateControlMode = (outputId: string, controlMode: ControlMode) =>
    this.#outputs[outputId]?.updateControlMode(controlMode);
  setNewOutputState = (
    outputId: string,
    newState: PCA9685State,
    targetControlMode: ControlMode,
  ) => this.#outputs[outputId]?.setNewState(newState, targetControlMode);
  executeOutputState = (outputId?: string) =>
    outputId
      ? this.#outputs[outputId]?.executeState()
      : Object.keys(this.#outputs).forEach(
          (key) => this.#outputs[key]?.executeState(),
        );
  dispose = () => this.#pca9685?.dispose();
}

class PCA9685Output extends OutputBase {
  pca9685: Pca9685Driver;
  override manualState: PCA9685State;
  override scheduleState: PCA9685State;

  constructor(pca9685: Pca9685Driver, output: SDBOutput, sprootDB: ISprootDB) {
    super(output, sprootDB);
    this.pca9685 = pca9685;
    this.manualState = { value: 0 };
    this.scheduleState = { value: 0 };
  }

  executeState(): void {
    switch (this.controlMode) {
      case ControlMode.manual:
        this.#setPwm(this.manualState.value);
        break;

      case ControlMode.schedule:
        this.#setPwm(this.scheduleState.value);
        break;
    }
  }

  dispose = () => {
    this.#setPwm;
  };

  #setPwm(value: number): void {
    if (!this.isPwm && value != 0 && value != 100) {
      throw new OutputNotPWMError("Output is not a PWM output");
    }
    if (value < 0 || value > 100) {
      throw new OutputValueOutOfRange("PWM value must be between 0 and 100");
    }
    const calculatedOutputValue =
      (this.isInvertedPwm ? 100 - value : value) / 100;
    this.pca9685.setDutyCycle(this.pin, calculatedOutputValue);
  }
}

class OutputNotPWMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutputNotPWMError";
  }
}

class UsedOrInvalidPinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsedOrInvalidPinError";
  }
}

class OutputValueOutOfRange extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutputValueOutOfRange";
  }
}

interface PCA9685State extends IState {
  value: number;
}

export { PCA9685, PCA9685Output, PCA9685State };
