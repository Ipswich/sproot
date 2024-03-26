import { PCA9685 } from "./PCA9685";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { IOutputBase, ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { OutputBase } from "./OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import winston from "winston";
import { ChartData, DataSeries, IChartable } from "@sproot/sproot-common/dist/utility/IChartable";

class OutputList {
  #sprootDB: ISprootDB;
  #PCA9685: PCA9685;
  #outputs: Record<string, OutputBase> = {};
  #logger: winston.Logger;
  chartData: OutputListChartData;

  constructor(sprootDB: ISprootDB, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#logger = logger;
    this.#PCA9685 = new PCA9685(this.#sprootDB, this.#logger);
    this.chartData = new OutputListChartData(
      Number(process.env["MAX_CACHE_SIZE"]),
      Number(process.env["CHART_DATA_POINT_INTERVAL"]),
    );
  }

  get outputs(): Record<string, OutputBase> {
    return this.#outputs;
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

  updateControlMode(outputId: string, controlMode: ControlMode): void {
    this.#outputs[outputId]?.state.updateControlMode(controlMode);
  }

  setNewOutputState(
    outputId: string,
    newState: SDBOutputState,
    targetControlMode: ControlMode,
  ): void {
    this.#outputs[outputId]?.state.setNewState(newState, targetControlMode);
  }

  executeOutputState(outputId?: string): void {
    outputId
      ? this.#outputs[outputId]?.executeState()
      : Object.keys(this.#outputs).forEach((key) => this.#outputs[key]?.executeState());
  }

  dispose(): void {
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
  }

  async initializeOrRegenerateAsync(): Promise<void> {
    let outputListChanges = false;
    const profiler = this.#logger.startTimer();
    const outputsFromDatabase = await this.#sprootDB.getOutputsAsync();

    for (const output of outputsFromDatabase) {
      const key = Object.keys(this.#outputs).find((key) => key === output.id.toString());
      if (key) {
        //Update old ones
        let update = false;
        if (this.#outputs[key]?.name != output.name) {
          update = true;
          this.#outputs[key]!.name = output.name;
        }

        if (this.#outputs[key]?.isPwm != output.isPwm) {
          update = true;
          this.#outputs[key]!.isPwm = output.isPwm;
        }

        if (this.#outputs[key]?.isInvertedPwm != output.isInvertedPwm) {
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

          await this.#createOutputAsync(output);
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
      const dataSeries = Object.values(this.outputs).map((output) => output.chartData.get());
      this.chartData.loadChartData(dataSeries, "output");
      this.#logger.info(
        `Loaded aggregate output chart data. Data count: ${Object.keys(this.chartData.chartData.get()).length}`,
      );
    }

    profiler.done({
      message: "OutputList initializeOrRegenerate time",
      level: "debug",
    });
  }

  async addReadingsToDatabaseAsync(): Promise<void> {
    await this.#touchAllOutputsAsync(async (output) => {
      output.updateDataStores();
    });

    if (new Date().getMinutes() % 5 == 0) {
      this.chartData.updateChartData(
        Object.values(this.outputs).map((output) => output.chartData.get()),
        "output",
      );
    }

    this.#logger.info(
      `Updated aggregate output chart data. Data count: ${Object.keys(this.chartData.chartData.get()).length}`,
    );
  }

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

  async #createOutputAsync(output: SDBOutput): Promise<void> {
    let newOutput: OutputBase | null = null;
    switch (output.model.toLowerCase()) {
      case "pca9685": {
        if (!output.address) {
          throw new OutputListError("PCA9685 address cannot be null");
        }
        newOutput = await this.#PCA9685.createOutput(output);
        break;
      }
      default: {
        throw new OutputListError(`Unrecognized output model ${output.model}`);
      }
    }
    if (newOutput) {
      this.#outputs[output.id] = newOutput;
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

class OutputListChartData implements IChartable {
  chartData: ChartData;
  #limit;
  #interval;

  constructor(limit: number, interval: number) {
    this.chartData = new ChartData(limit, interval);
    this.#limit = limit;
    this.#interval = interval;
  }

  loadChartData(cache: DataSeries[], _name: string): void {
    const combinedData = ChartData.combineDataSeries([...cache]);
    this.chartData = new ChartData(this.#limit, this.#interval, combinedData);
  }

  updateChartData(cache: DataSeries[], _name: string): void {
    const newValues = cache
      .map((dataSeries) => dataSeries[dataSeries.length - 1]!)
      .filter((value) => value !== undefined);
    const newChartData = ChartData.combineDataSeries([newValues]);
    //No duplicate time stamps
    if (
      newChartData[0] !== undefined &&
      newChartData[0].name != this.chartData.get().slice(-1)[0]?.name
    ) {
      this.chartData.addDataPoint(newChartData[0]);
    }
  }
}

class OutputListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildOutputError";
  }
}

export { OutputList, OutputListChartData };
