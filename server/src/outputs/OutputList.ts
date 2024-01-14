import { PCA9685 } from "./PCA9685";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import {
  OutputBase,
  IOutputBase,
  IState,
  ControlMode,
} from "@sproot/sproot-common/dist/outputs/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import winston from "winston";

class OutputList {
  #sprootDB: ISprootDB;
  #PCA9685: PCA9685;
  #outputs: Record<string, OutputBase> = {};
  #logger: winston.Logger;

  constructor(sprootDB: ISprootDB, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#logger = logger;
    this.#PCA9685 = new PCA9685(this.#sprootDB, this.#logger);
  }

  get outputs(): Record<string, OutputBase> {
    return this.#outputs;
  }

  get outputData(): Record<string, IOutputBase> {
    const cleanObject: Record<string, IOutputBase> = {};
    for (const key in this.#outputs) {
      const {
        id,
        model,
        address,
        name,
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
        name,
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
  setNewOutputState = (outputId: string, newState: IState, targetControlMode: ControlMode) =>
    this.#outputs[outputId]?.setNewState(newState, targetControlMode);
  executeOutputState = (outputId?: string) =>
    outputId
      ? this.#outputs[outputId]?.executeState()
      : Object.keys(this.#outputs).forEach((key) => this.#outputs[key]?.executeState());
  dispose = () => {
    for (const key in this.#outputs) {
      try {
        this.#deleteOutput(this.#outputs[key]!);
      } catch (err) {
        this.#logger.error(
          `Could not delete output {model: ${this.#outputs[key]?.model}, id: ${this.#outputs[key]?.id}}. ${err}`,
        );
      }
    }
    this.#outputs = {};
  };

  async initializeOrRegenerateAsync(): Promise<void> {
    const profiler = this.#logger.startTimer();
    const outputsFromDatabase = await this.#sprootDB.getOutputsAsync();

    for (const output of outputsFromDatabase) {
      const key = Object.keys(this.#outputs).find((key) => key === output.id.toString());
      if (key) {
        //Update old ones
        this.#outputs[key]!.name = output.name;
        this.#outputs[key]!.isPwm = output.isPwm;
        this.#outputs[key]!.isInvertedPwm = output.isInvertedPwm;
      } else {
        //Add new ones
        try {
          this.#logger.info(`Creating output {model: ${output.model}, id: ${output.id}}`);
          this.#createOutput(output);
        } catch (err) {
          this.#logger.error(
            `Could not build output {model: ${output.model}, id: ${output.id}}. ${err}`,
          );
        }
      }
    }

    //Remove deleted ones
    const outputIdsFromDatabase = outputsFromDatabase.map((output) => output.id.toString());
    for (const key in this.#outputs) {
      if (!outputIdsFromDatabase.includes(key)) {
        try {
          this.#logger.info(
            `Deleting output {model: ${this.#outputs[key]?.model}, id: ${this.#outputs[key]?.id}}`,
          );
          this.#deleteOutput(this.#outputs[key]!);
          delete this.#outputs[key];
        } catch (err) {
          this.#logger.error(
            `Could not delete output {model: ${this.#outputs[key]?.model}, id: ${this.#outputs[key]?.id}}. ${err}`,
          );
        }
      }
    }
    profiler.done({
      message: "OutputList initializeOrRegenerate time",
      level: "debug",
    });
  }

  #createOutput(output: SDBOutput): void {
    let newOutput: OutputBase | null = null;
    switch (output.model.toLowerCase()) {
      case "pca9685": {
        if (!output.address) {
          throw new OutputListError("PCA9685 address cannot be null");
        }
        newOutput = this.#PCA9685.createOutput(output);
        if (newOutput) {
          this.#outputs[output.id] = newOutput;
        }

        break;
      }
      default: {
        throw new OutputListError(`Unrecognized output model ${output.model}`);
      }
    }
  }

  #deleteOutput(output: OutputBase): void {
    switch (output.model.toLowerCase()) {
      case "pca9685": {
        if (!output.address) {
          throw new OutputListError("PCA9685 address cannot be null");
        }
        this.#PCA9685.disposeOutput(output);
        delete this.#outputs[output.id];
        break;
      }
      default: {
        throw new OutputListError(`Unrecognized output model ${output.model}`);
      }
    }
  }
}

class OutputListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildOutputError";
  }
}

export { OutputList };
