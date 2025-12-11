import { PCA9685 } from "../PCA9685";
import { ESP32_PCA9685, ESP32_PCA9685Output } from "../ESP32_PCA9685";
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
import { Models } from "@sproot/sproot-common/dist/outputs/Models";
import { MdnsService } from "../../system/MdnsService";

class OutputList implements AsyncDisposable {
  #sprootDB: ISprootDB;
  #PCA9685: PCA9685;
  #ESP32_PCA9685: ESP32_PCA9685;
  #TPLinkSmartPlugs: TPLinkSmartPlugs;
  #outputs: Record<string, OutputBase> = {};
  #logger: winston.Logger;
  #chartData: OutputListChartData;
  #isUpdating: boolean = false;
  maxCacheSize: number;
  initialCacheLookback: number;
  maxChartDataSize: number;
  chartDataPointInterval: number;

  constructor(
    sprootDB: ISprootDB,
    mdnsService: MdnsService,
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
    this.#ESP32_PCA9685 = new ESP32_PCA9685(
      this.#sprootDB,
      mdnsService,
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

  async updateControlModeAsync(outputId: string, controlMode: ControlMode): Promise<void> {
    this.#outputs[outputId]?.updateControlModeAsync(controlMode);
  }

  async setAndExecuteStateAsync(outputId: string, newState: SDBOutputState): Promise<void> {
    await this.#outputs[outputId]?.setAndExecuteStateAsync(newState);
  }

  async setStateAsync(outputId: string, newState: SDBOutputState): Promise<void> {
    await this.#outputs[outputId]?.setStateAsync(newState);
  }

  async executeOutputStateAsync(outputId?: string) {
    if (outputId) {
      this.#logger.verbose(`Executing output state {outputId: ${outputId}}`);
      return await this.outputs[outputId]?.executeStateAsync();
    }
    this.#logger.verbose(`Executing output state for all outputs`);
    const promises = Object.keys(this.outputs).map((key) => this.outputs[key]?.executeStateAsync());
    await Promise.all(promises);
  }

  async runAutomationsAsync(sensorList: SensorList, now: Date, outputId?: number): Promise<void> {
    if (outputId) {
      await this.#outputs[outputId]?.runAutomationsAsync(sensorList, this, now);
      return;
    }
    const promises = Object.values(this.#outputs).map((output) =>
      output.runAutomationsAsync(sensorList, this, now),
    );
    await Promise.allSettled(promises);
  }

  getAvailableDevices(
    model: string,
    address?: string,
    filterUsed?: boolean,
  ): Record<string, string>[] {
    switch (model) {
      case Models.PCA9685:
        return this.#PCA9685.getAvailableDevices(address);
      case Models.ESP32_PCA9685:
        return this.#ESP32_PCA9685.getAvailableDevices(address);
      case Models.TPLINK_SMART_PLUG:
        return this.#TPLinkSmartPlugs.getAvailableDevices(address, filterUsed);
      default:
        return [];
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.#logger.debug("Disposing of system OutputList");
    for (const key in this.#outputs) {
      try {
        await this.#deleteOutputAsync(this.#outputs[key]!);
      } catch (err) {
        this.#logger.error(
          `Could not delete output {model: ${this.#outputs[key]?.model}, id: ${this.#outputs[key]?.id}}. ${err}`,
        );
      }
    }
    this.#outputs = {};
    await this.#TPLinkSmartPlugs[Symbol.asyncDispose]();
  }

  async initializeOrRegenerateAsync(): Promise<void> {
    if (this.#isUpdating) {
      this.#logger.warn(
        "OutputList is already updating, skipping initializeOrRegenerateAsync call.",
      );
      return;
    }
    try {
      let outputListChanges = false;
      const profiler = this.#logger.startTimer();
      const outputsFromDatabase = await this.#sprootDB.getOutputsAsync();
      const subcontrollersFromDatabase = await this.#sprootDB.getSubcontrollersAsync();

      const promises = [];
      for (const output of outputsFromDatabase) {
        const key = Object.keys(this.#outputs).find((key) => key === output.id.toString());
        //Update if it exists
        if (key) {
          // Check for Subcontroller changes
          if (this.#outputs[key]?.subcontrollerId != output.subcontrollerId) {
            outputListChanges = true;
            this.#outputs[key]!.subcontrollerId = output.subcontrollerId;
          }

          if (this.#outputs[key] instanceof ESP32_PCA9685Output) {
            const subcontroller = subcontrollersFromDatabase.find(
              (sub) => sub.id == output.subcontrollerId,
            );

            if (subcontroller != null) {
              if (
                this.#outputs[key]?.subcontroller.name != subcontroller?.name ||
                this.#outputs[key]?.subcontroller.hostName != subcontroller?.hostName
              ) {
                outputListChanges = true;
                this.#outputs[key].subcontroller = subcontroller;
              }
            }
          }

          // Check for actual output changes
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
            await this.#deleteOutputAsync(this.#outputs[key]!);
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
    } finally {
      this.#isUpdating = false;
    }
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
      case Models.PCA9685.toLowerCase(): {
        newOutput = await this.#PCA9685.createOutputAsync(output);
        break;
      }
      case Models.ESP32_PCA9685.toLowerCase(): {
        newOutput = await this.#ESP32_PCA9685.createOutputAsync(output);
        break;
      }
      case Models.TPLINK_SMART_PLUG.toLowerCase(): {
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

  async #deleteOutputAsync(output: OutputBase): Promise<void> {
    switch (output.model.toLowerCase()) {
      case Models.PCA9685.toLowerCase(): {
        await this.#PCA9685.disposeOutputAsync(output);
        break;
      }
      case Models.ESP32_PCA9685.toLowerCase(): {
        await this.#ESP32_PCA9685.disposeOutputAsync(output);
        break;
      }
      case Models.TPLINK_SMART_PLUG.toLowerCase(): {
        await this.#TPLinkSmartPlugs.disposeOutputAsync(output);
        break;
      }
      default: {
        if (this.#outputs[output.id] !== undefined) {
          await this.#outputs[output.id]![Symbol.asyncDispose]();
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
