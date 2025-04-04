import { PCA9685 } from "../PCA9685";
import { TPLinkSmartPlugs } from "../TPLinkSmartPlugs";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { IOutputBase, ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { OutputBase } from "../base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import winston from "winston";
import { ChartData } from "@sproot/sproot-common/dist/utility/ChartData";
import { OutputListChartData } from "./OutputListChartData";
import { SensorList } from "../../sensors/list/SensorList";
import { OutputAutomation } from "../../automation/outputs/OutputAutomation";
import ModelList from "../ModelList";

class OutputList implements Disposable {
  #sprootDB: ISprootDB;
  #PCA9685: PCA9685;
  #TPLinkSmartPlugs: TPLinkSmartPlugs;
  #outputs: Record<string, OutputBase> = {};
  #logger: winston.Logger;
  #chartData: OutputListChartData;
  maxCacheSize: number;
  initialCacheLookback: number;
  maxChartDataSize: number;
  chartDataPointInterval: number;

  constructor(
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    this.#sprootDB = sprootDB;
    this.#logger = logger;
    this.#PCA9685 = new PCA9685(
      this.#sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      undefined,
      this.#logger,
    );
    this.#TPLinkSmartPlugs = new TPLinkSmartPlugs(
      this.#sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      this.#logger,
    );
    this.maxCacheSize = maxCacheSize;
    this.initialCacheLookback = initialCacheLookback;
    this.maxChartDataSize = maxChartDataSize;
    this.chartDataPointInterval = chartDataPointInterval;
    this.#chartData = new OutputListChartData(maxChartDataSize, chartDataPointInterval);
  }

  get outputs(): Record<string, OutputBase> {
    return this.#outputs;
  }

  get outputData(): Record<string, IOutputBase> {
    const cleanObject: Record<string, IOutputBase> = {};
    for (const key in this.#outputs) {
      if (this.#outputs[key]) {
        cleanObject[key] = this.#outputs[key]?.outputData;
      }
    }
    return cleanObject;
  }

  get chartData(): OutputListChartData {
    return this.#chartData;
  }

  updateControlMode(outputId: string, controlMode: ControlMode): void {
    this.#outputs[outputId]?.state.updateControlMode(controlMode);
  }

  async setNewOutputStateAsync(
    outputId: string,
    newState: SDBOutputState,
    targetControlMode: ControlMode,
  ): Promise<void> {
    await this.#outputs[outputId]?.state.setNewStateAsync(newState, targetControlMode);
  }

  async executeOutputStateAsync(outputId?: string) {
    if (outputId) {
      return await this.outputs[outputId]?.executeStateAsync();
    }
    const promises = Object.keys(this.outputs).map(
      async (key) => await this.outputs[key]?.executeStateAsync(),
    );
    await Promise.allSettled(promises);
  }

  async runAutomationsAsync(sensorList: SensorList, now: Date, outputId?: number): Promise<void> {
    outputId
      ? await this.#outputs[outputId]?.runAutomationsAsync(sensorList, this, now)
      : Object.values(this.#outputs).forEach(
          async (output) => await output.runAutomationsAsync(sensorList, this, now),
        );
  }

  getAutomations() {
    const allAutomations = {} as Record<number, Record<string, OutputAutomation>>;
    for (const output of Object.values(this.#outputs)) {
      const automations = output.getAutomations();
      if (Object.keys(automations).length > 0) {
        allAutomations[output.id] = automations;
      }
    }

    return allAutomations;
  }

  getAvailableDevices(
    model: string,
    address?: string,
    filterUsed?: boolean,
  ): Record<string, string>[] {
    switch (model) {
      case ModelList.PCA9685.toLowerCase():
        return []; //this.#PCA9685.getAvailableChildIds(address);
      case ModelList.TPLinkSmartPlug.toLowerCase():
        return this.#TPLinkSmartPlugs.getAvailableDevices(address, filterUsed);
      default:
        return [];
    }
  }

  [Symbol.dispose](): void {
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
    this.#TPLinkSmartPlugs[Symbol.dispose]();
  }

  async initializeOrRegenerateAsync(): Promise<void> {
    let outputListChanges = false;
    const profiler = this.#logger.startTimer();
    const outputsFromDatabase = await this.#sprootDB.getOutputsAsync();

    const promises = [];
    for (const output of outputsFromDatabase) {
      const key = Object.keys(this.#outputs).find((key) => key === output.id.toString());
      if (key) {
        //Update if it exists
        await this.#outputs[key]!.loadAutomationsAsync();

        if (this.#outputs[key]?.name != output.name) {
          outputListChanges = true;
          //Also updates chart data (and series)
          this.#outputs[key]!.updateName(output.name);
        }

        if (this.#outputs[key]?.isPwm != output.isPwm) {
          outputListChanges = true;
          this.#outputs[key]!.isPwm = output.isPwm;
        }

        if (this.#outputs[key]?.isInvertedPwm != output.isInvertedPwm) {
          outputListChanges = true;
          this.#outputs[key]!.isInvertedPwm = output.isInvertedPwm;
        }

        if (this.#outputs[key]?.color != output.color) {
          outputListChanges = true;
          //Also updates chart data (and series)
          this.#outputs[key]!.updateColor(output.color);
        }

        if (this.#outputs[key]?.automationTimeout != output.automationTimeout) {
          outputListChanges = true;
          this.#outputs[key]!.automationTimeout = output.automationTimeout;
        }

        if (outputListChanges) {
          this.#logger.info(
            `Updating output {model: ${this.#outputs[key]?.model}, id: ${this.#outputs[key]?.id}}`,
          );
        }
      } else {
        //Create if it doesn't
        this.#logger.info(`Creating output {model: ${output.model}, id: ${output.id}}`);
        promises.push(
          this.#createOutputAsync(output).catch((err) =>
            this.#logger.error(
              `Could not build output {model: ${output.model}, id: ${output.id}}. ${err}`,
            ),
          ),
        );
        outputListChanges = true;
      }
    }
    await Promise.allSettled(promises);

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
      const data = Object.values(this.outputs).map((output) => output.getChartData().data);
      const series = Object.values(this.outputs).map((output) => output.getChartData().series);
      this.#chartData.loadChartData(data, "output");
      this.#chartData.loadChartSeries(series);
      this.#logger.info(
        `Loaded aggregate output chart data. Data count: ${Object.keys(this.#chartData.chartData.get()).length}`,
      );
    }

    profiler.done({
      message: "OutputList initializeOrRegenerate time",
      level: "debug",
    });
  }

  async updateDataStoresAsync(): Promise<void> {
    await this.#touchAllOutputsAsync(async (output) => {
      output.updateDataStoresAsync();
    });

    if (ChartData.shouldUpdateByInterval(new Date(), this.chartDataPointInterval)) {
      this.#chartData.updateChartData(
        Object.values(this.outputs).map((output) => output.getChartData().data),
        "output",
      );
      this.#logger.info(
        `Updated aggregate output chart data. Data count: ${Object.keys(this.#chartData.chartData.get()).length}`,
      );
    }
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
    let newOutput: OutputBase | undefined;
    switch (output.model.toLowerCase()) {
      case ModelList.PCA9685.toLowerCase(): {
        newOutput = await this.#PCA9685.createOutputAsync(output);
        break;
      }
      case ModelList.TPLinkSmartPlug.toLowerCase(): {
        newOutput = await this.#TPLinkSmartPlugs.createOutputAsync(output);
        break;
      }
      default:
        throw new OutputListError(`Unrecognized output model ${output.model}`);
    }
    if (newOutput) {
      this.#outputs[output.id] = newOutput;
    }
  }

  #deleteOutput(output: OutputBase): void {
    switch (output.model.toLowerCase()) {
      case ModelList.PCA9685.toLowerCase(): {
        this.#PCA9685.disposeOutput(output);
        break;
      }
      case ModelList.TPLinkSmartPlug.toLowerCase(): {
        this.#TPLinkSmartPlugs.disposeOutput(output);
        break;
      }
      default: {
        if (this.#outputs[output.id] !== undefined) {
          this.#outputs[output.id]!.dispose();
        }
      }
    }
    delete this.#outputs[output.id];
  }
}

class OutputListError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export { OutputList };
