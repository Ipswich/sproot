import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { AvailableDevice } from "@sproot/sproot-common/dist/outputs/AvailableDevice";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";

class ESP32_PCA9685 extends MultiOutputBase {
  constructor(
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    frequency: number = 800,
    logger: winston.Logger,
  ) {
    super(
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      frequency,
      logger,
    );
  }

  async createOutputAsync(output: SDBOutput): Promise<OutputBase | undefined> {
    if (output.externalAddress == undefined) {
      this.logger.error(`ESP32_PCA9685 Output ${output.id} is missing externalAddress.`);
      return undefined;
    }

    //Create new PCA9685 if one doesn't exist for this address.
    if (!this.usedPins[output.externalAddress]) {
      this.usedPins[output.externalAddress] = {};
    }
    if (!(this.usedPins[output.externalAddress] as Record<string, string[]>)[output.address]) {
      (this.usedPins[output.externalAddress] as Record<string, string[]>)[output.address] = [];
    }

    this.outputs[output.id] = new ESP32_PCA9685Output(
      output,
      this.sprootDB,
      this.maxCacheSize,
      this.initialCacheLookback,
      this.maxChartDataSize,
      this.chartDataPointInterval,
      this.logger,
    );
    await this.outputs[output.id]?.initializeAsync();
    (this.usedPins[output.externalAddress] as Record<string, string[]>)[output.address]?.push(
      output.pin,
    );
    return this.outputs[output.id];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override getAvailableDevices(_address?: string): AvailableDevice[] {
    return [];
    // const childIds = Array.from({ length: 16 }, (_, i) => i.toString());
    // return childIds.filter((childId) => !this.usedPins[address]?.includes(childId));
  }

  async [Symbol.asyncDispose](): Promise<void> {
    for (const output of Object.values(this.outputs)) {
      await output[Symbol.asyncDispose]();
    }
  }
}

class ESP32_PCA9685Output extends OutputBase {
  constructor(
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
  }

  async executeStateAsync(forceExecution: boolean = false): Promise<void> {
    await this.executeStateHelperAsync(async (value) => {
      await this.#setPCA9685ValueAsync(value);
    }, forceExecution);
  }

  override async [Symbol.asyncDispose](): Promise<void> {
    await this.#setPCA9685ValueAsync(0);
  }

  async #setPCA9685ValueAsync(value: number): Promise<void> {
    await fetch(
      this.outputData.externalAddress +
        `/api/outputs/pca9685/${this.outputData.address}/${this.outputData.pin}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value,
        }),
      },
    );
    return;
  }
}

export { ESP32_PCA9685, ESP32_PCA9685Output };
