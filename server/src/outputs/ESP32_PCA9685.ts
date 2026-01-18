import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBSubcontroller } from "@sproot/sproot-common/dist/database/SDBSubcontroller";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { AvailableDevice } from "@sproot/sproot-common/dist/outputs/AvailableDevice";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";
import { MdnsService } from "../system/MdnsService";

class ESP32_PCA9685 extends MultiOutputBase {
  #mdnsService: MdnsService;

  constructor(
    sprootDB: ISprootDB,
    mdnsService: MdnsService,
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
    this.#mdnsService = mdnsService;
  }

  async createOutputAsync(output: SDBOutput): Promise<OutputBase | undefined> {
    if (output.subcontrollerId == undefined) {
      this.logger.error(`ESP32_PCA9685 Output ${output.id} is missing subcontrollerId.`);
      return undefined;
    }
    const subcontroller = (await this.sprootDB.getSubcontrollersAsync()).find(
      (device) => device.id == output.subcontrollerId,
    );
    if (subcontroller == null) {
      this.logger.error(
        `ESP32_PCA9685 Output ${output.id} references non-existent subcontrollerId ${output.subcontrollerId}.`,
      );
      return undefined;
    }

    //Create new PCA9685 if one doesn't exist for this address.
    if (!this.usedPins[output.subcontrollerId]) {
      this.usedPins[output.subcontrollerId] = {};
    }
    if (!(this.usedPins[output.subcontrollerId] as Record<string, string[]>)[output.address]) {
      (this.usedPins[output.subcontrollerId] as Record<string, string[]>)[output.address] = [];
    }

    this.outputs[output.id] = await ESP32_PCA9685Output.createInstanceAsync(
      output,
      subcontroller,
      this.sprootDB,
      this.#mdnsService,
      this.maxCacheSize,
      this.initialCacheLookback,
      this.maxChartDataSize,
      this.chartDataPointInterval,
      this.logger,
    );
    (this.usedPins[output.subcontrollerId] as Record<string, string[]>)[output.address]?.push(
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
  subcontroller: SDBSubcontroller;
  #mdnsService: MdnsService;
  
  static createInstanceAsync(
    output: SDBOutput,
    subcontroller: SDBSubcontroller,
    sprootDB: ISprootDB,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ): Promise<ESP32_PCA9685Output> {
    const esp32PCA9685Output = new ESP32_PCA9685Output(
      output,
      subcontroller,
      sprootDB,
      mdnsService,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger,
    );
    return esp32PCA9685Output.initializeAsync();
  }

  private constructor(
    output: SDBOutput,
    subcontroller: SDBSubcontroller,
    sprootDB: ISprootDB,
    mdnsService: MdnsService,
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
    this.subcontroller = subcontroller;
    this.#mdnsService = mdnsService;
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
    const ipAddress = this.#mdnsService.getIPAddressByHostName(this.subcontroller.hostName);
    if (ipAddress == null) {
      this.logger.error(
        `Failed to set PCA9685 output ${this.outputData.id} value. Unable to resolve hostname ${this.subcontroller.hostName}.`,
      );
      return;
    }
    await fetch(
      `http://${ipAddress}/api/outputs/pca9685/${this.outputData.address}/${this.outputData.pin}`,
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
