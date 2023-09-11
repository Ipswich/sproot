import {Pca9685Driver } from 'pca9685';
import { openSync } from 'i2c-bus';
import { OutputBase } from '../types/OutputBase';
import { GDBOutput } from '../types/database-objects/GDBOutput';
import { IGrowthDB } from '../types/database-objects/IGrowthDB';

class PCA9685 {
  #pca9685 : Pca9685Driver | undefined;
  #outputs: Record<string, (PCA9685Output | PCA9685PWMOutput)>;
  #growthDB: IGrowthDB;
  #address: number;
  #frequency: number;
  constructor(growthDB: IGrowthDB) {
    this.#growthDB = growthDB;
    this.#outputs = {};
    this.#address = 0x40;
    this.#frequency = 50;
  }

  async initializeOrRegenerateAsync(): Promise<PCA9685> {
    if (!this.#pca9685) {
      this.#pca9685 = new Pca9685Driver({
        i2c: openSync(1),
        address: this.#address,
        frequency: this.#frequency,
        debug: false
      }, ()=>{});
    }
    const outputsFromDatabase = await this.#growthDB.getOutputs();

    //Update old ones
    outputsFromDatabase.forEach(async (output) => {
      const key = Object.keys(this.#outputs).find((key) => key === output.id.toString());
      if (key) {
        this.#outputs[key]!.description = output.description;
      }
    });

    //Add new ones
    let filteredOutputsFromDatabase = outputsFromDatabase.filter((output) => !Object.keys(this.#outputs).includes(String(output.id)))
    for (const output of filteredOutputsFromDatabase) {
      if (output.isPwm) {
        this.#outputs[output.id] = (new PCA9685PWMOutput(this.#pca9685, output, this.#growthDB));
      } else {
        this.#outputs[output.id] = (new PCA9685Output(this.#pca9685, output, this.#growthDB));
      }
    }

    //Remove deleted ones
    const outputIdsFromDatabase = outputsFromDatabase.map((output) => output.id.toString());
    for (const key in this.#outputs) {
      if (!outputIdsFromDatabase.includes(key)) {
        delete this.#outputs[key];
      }
    }
    return this;
  }

  get outputs(): Record<string, (PCA9685Output | PCA9685PWMOutput)> {
    return this.#outputs;
  }

  async turnOnOutputAsync(outputId: string): Promise<void> {
    await this.#outputs[outputId]?.turnOn();
  }

  async turnOffOutputAsync(outputId: string): Promise<void> {
    await this.#outputs[outputId]?.turnOff();
  }

  async setPwmOutputAsync(outputId: string, value: number): Promise<void> {
    if (this.#outputs[outputId] instanceof PCA9685PWMOutput) {
      await (this.#outputs[outputId] as PCA9685PWMOutput).setPwm(value);
    } else {
      throw new OutputNotPWMError('Output is not a PWM output');
    }
  }

  async turnOffAllOutputsAsync(): Promise<void> {
    for (const key in this.#outputs) {
      await this.#outputs[key]?.turnOff();
    }
  }
}

class PCA9685Output extends OutputBase {
  pca9685: Pca9685Driver;

  constructor(pca9685: Pca9685Driver, output: GDBOutput, growthDB: IGrowthDB){
    super(output, growthDB);
    this.pca9685 = pca9685;
  }

  turnOn = async (): Promise<void> => this.pca9685.channelOn(this.pin);
  turnOff = async (): Promise<void> => this.pca9685.channelOff(this.pin);
}

class PCA9685PWMOutput extends PCA9685Output {
  constructor(pca9685: Pca9685Driver, output: GDBOutput, growthDB: IGrowthDB){
    super(pca9685, output, growthDB);
  }
  //TODO INVERT VALUE
  async setPwm (value: number): Promise<void> {
    const adjustedValue = (this.isInvertedPwm ? 100 - value : value)/100;
    this.pca9685.setDutyCycle(this.pin, adjustedValue);
  }
}

class OutputNotPWMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutputNotPWMError';
  }
}

export { PCA9685 };