import { PCA9685 } from "./PCA9685";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import {
  OutputBase,
  IOutputBase,
  IState,
  ControlMode,
} from "@sproot/sproot-common/dist/outputs/OutputBase";
import winston from "winston";

class OutputList {
  #sprootDB: ISprootDB;
  #pca9685Record: Record<string, PCA9685> = {};
  #outputs: Record<string, OutputBase> = {};
  #usedAddresses: string[] = [];
  #logger: winston.Logger;

  constructor(sprootDB: ISprootDB, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#logger = logger;
  }

  get outputs(): Record<string, OutputBase> {
    return this.#outputs;
  }
  get pca9685Record(): Record<string, PCA9685> {
    return this.#pca9685Record;
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
  setNewOutputState = (outputId: string, newState: IState, targetControlMode: ControlMode) =>
    this.#outputs[outputId]?.setNewState(newState, targetControlMode);
  executeOutputState = (outputId?: string) =>
    outputId
      ? this.#outputs[outputId]?.executeState()
      : Object.keys(this.#outputs).forEach((key) => this.#outputs[key]?.executeState());
  dispose = () => {
    for (const key in this.#outputs) {
      this.#outputs[key]?.dispose();
    }
    for (const key in this.#pca9685Record) {
      this.#pca9685Record[key]?.dispose();
    }
    this.#pca9685Record = {};
    this.#outputs = {};
    this.#usedAddresses = [];
  };

  async initializeOrRegenerateAsync(): Promise<void> {
    const outputsFromDatabase = await this.#sprootDB.getOutputsAsync();

    //Update old ones
    for (const output of outputsFromDatabase) {
      const key = Object.keys(this.#outputs).find((key) => key === output.id.toString());
      if (key) {
        this.#outputs[key]!.description = output.description;
        this.#outputs[key]!.isPwm = output.isPwm;
        this.#outputs[key]!.isInvertedPwm = output.isInvertedPwm;
      }
    }

    //Add new ones
    const filteredOutputsFromDatabase = outputsFromDatabase.filter(
      (output) => !Object.keys(this.#outputs).includes(String(output.id)),
    );
    for (const output of filteredOutputsFromDatabase) {
      this.#logger.info(`Creating output ${output.model} ${output.id}`);
      switch (output.model.toLowerCase()) {
        case "pca9685": {
          if (!this.#pca9685Record[output.address]) {
            this.#pca9685Record[output.address] = new PCA9685(
              this.#sprootDB,
              this.#logger,
              parseInt(output.address),
            );
            this.#usedAddresses.push(output.address);
          }
          try {
            const pca9685Outputs = (
              await this.#pca9685Record[output.address]?.initializeOrRegenerateAsync()
            )?.outputs;
            for (const key in pca9685Outputs) {
              this.#outputs[key] = pca9685Outputs[key]!;
            }
          } catch (err) {
            this.#logger.error(err);
          }
          break;
        }
      }
    }

    //Remove deleted ones
    const outputIdsFromDatabase = outputsFromDatabase.map((output) => output.id.toString());
    for (const key in this.#outputs) {
      if (!outputIdsFromDatabase.includes(key)) {
        this.#outputs[key]?.dispose();
        this.#logger.info(`Deleting output ${this.#outputs[key]?.model} ${this.#outputs[key]?.id}`);
        delete this.#outputs[key];
      }
    }
    for (const key in this.#usedAddresses) {
      if (!outputsFromDatabase.find((output) => output.address === this.#usedAddresses[key])) {
        this.#logger.info(`Deleting PCA9685 Board${this.#usedAddresses[key]}`);
        this.#pca9685Record[this.#usedAddresses[key]!]?.dispose();
        delete this.#pca9685Record[this.#usedAddresses[key]!];
        this.#usedAddresses.splice(this.#usedAddresses.indexOf(this.#usedAddresses[key]!), 1);
      }
    }
  }
}

export { OutputList };
