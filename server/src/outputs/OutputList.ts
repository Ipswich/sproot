import { PCA9685 } from "./PCA9685";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import {
  IOutputBase,
  ControlMode,
} from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { OutputBase } from "./OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import winston from "winston";
import { ChartData } from "@sproot/sproot-common/dist/api/ChartData";

class OutputList {
  #sprootDB: ISprootDB;
  #PCA9685: PCA9685;
  #outputs: Record<string, OutputBase> = {};
  #logger: winston.Logger;
  #chartData: ChartData[] = [];

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
        cachedStates,
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
        cachedStates,
      };
    }
    return cleanObject;
  }

  updateControlMode = (outputId: string, controlMode: ControlMode) =>
    this.#outputs[outputId]?.updateControlMode(controlMode);

  setNewOutputState = (
    outputId: string,
    newState: SDBOutputState,
    targetControlMode: ControlMode,
  ) => this.#outputs[outputId]?.setNewState(newState, targetControlMode);

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
    let outputListChanges = false;
    const profiler = this.#logger.startTimer();
    const outputsFromDatabase = await this.#sprootDB.getOutputsAsync();

    for (const output of outputsFromDatabase) {
      const key = Object.keys(this.#outputs).find((key) => key === output.id.toString());
      if (key) {
        //Update old ones
        let update = false;
        if (this.#outputs[key]?.name !== output.name) {
          update = true;
          this.#outputs[key]!.name = output.name;
        }

        if (this.#outputs[key]?.isPwm !== output.isPwm) {
          update = true;
          this.#outputs[key]!.isPwm = output.isPwm;
        }

        if (this.#outputs[key]?.isInvertedPwm !== output.isInvertedPwm) {
          update = true;
          this.#outputs[key]!.isInvertedPwm = output.isInvertedPwm;
        }

        if (update) {
          this.#logger.info(
            `Updating output {model: ${this.#outputs[key]?.model}, id: ${this.#outputs[key]?.id}}`,
          );
          outputListChanges = true;
        }
      } else {
        //Add new ones
        try {
          this.#logger.info(`Creating output {model: ${output.model}, id: ${output.id}}`);
          this.#createOutput(output);
          outputListChanges = true;
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
          outputListChanges = true;
        } catch (err) {
          this.#logger.error(
            `Could not delete output {model: ${this.#outputs[key]?.model}, id: ${this.#outputs[key]?.id}}. ${err}`,
          );
        }
      }
    }

    if (outputListChanges) {
      this.loadChartDataFromCachedStates();
    }

    profiler.done({
      message: "OutputList initializeOrRegenerate time",
      level: "debug",
    });
  }

  async addReadingsToDatabaseAsync(): Promise<void> {
    await this.#touchAllOutputsAsync(async (output) => {
      output.addLastStateToDatabase();
    });
    this.updateChartDataFromCachedStates();
  }

  //#####

  loadChartDataFromCachedStates() {
    //Format cached readings for recharts
    const profiler = this.#logger.startTimer();
    const chartObject = {} as Record<string, ChartData>;
    for (const key in this.#outputs) {
      const sensor = this.#outputs[key]!;
      for (const state of sensor.cachedStates) {
        const logTimeAsDate = new Date(state.logTime);
        if (logTimeAsDate.getMinutes() % 5 !== 0) {
          continue;
        }
        const logTime = this.#formatDateForChart(logTimeAsDate);
        if (!chartObject[logTime]) {
          chartObject[logTime] = {
            name: logTime,
          } as ChartData;
        }
        chartObject[logTime]![sensor.name] = state.value;
      }
    }
    // Convert to array
    this.#chartData = Object.values(chartObject);

    //Remove extra readings
    while (this.#chartData.length > Number(process.env["MAX_CHART_DATA_POINTS"]!)) {
      this.#chartData.shift();
    }

    // Log changes
    this.#logger.info(`Loaded output chart data. Data Count: ${this.#chartData.length}`);
    profiler.done({
      message: "OutputList loadChartDataFromCachedStates time",
      level: "debug",
    });
  }

  updateChartDataFromCachedStates() {
    const profiler = this.#logger.startTimer();
    let update = false;
    let updatedChartData = {} as ChartData;
    for (const output of Object.values(this.#outputs)) {
      const states = output.cachedStates;
      const lastState = states[states.length - 1]!;
      const logTimeAsDate = new Date(lastState.logTime);
      // If it isn't a 5 minute interval, skip
      if (logTimeAsDate.getMinutes() % 5 !== 0) {
        continue;
      }
      update = true;
      const formattedTime = this.#formatDateForChart(logTimeAsDate);
      if (!updatedChartData[formattedTime]) {
        updatedChartData = {
          name: formattedTime,
        } as ChartData;
      }
      updatedChartData[output.name] = lastState.value;
    }
    if (!update) {
      return;
    }
    // Add new readings
    this.#chartData.push(updatedChartData);

    //Remove old readings
    while (this.#chartData.length > Number(process.env["MAX_CHART_DATA_POINTS"]!)) {
      this.#chartData.shift();
    }

    // Log changes
    this.#logger.info(`Updated output chart data. Data count: ${this.#chartData.length}`);
    profiler.done({
      message: "OutputList updateChartDataFromCachedStates time",
      level: "debug",
    });
  }

  //#####

  async #touchAllOutputsAsync(fn: (arg0: OutputBase) => Promise<void>): Promise<void> {
    const promises = [];

    for (const key in this.#outputs) {
      promises.push(
        fn(this.#outputs[key] as OutputBase).catch((err) => {
          this.#logger.error(err);
        }),
      );
    }
    await Promise.allSettled(promises);
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

  #formatDateForChart(date: Date): string {
    let hours = date.getHours();
    const amOrPm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${month}/${day} ${hours}:${minutes} ${amOrPm}`;
  }
}

class OutputListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildOutputError";
  }
}

export { OutputList };
