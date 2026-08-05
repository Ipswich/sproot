import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/common/database/SDBOutput";
import { SDBSubcontroller } from "@sproot/common/database/SDBSubcontroller";
import type { IOutputsRepository } from "../database/repositories/outputs/IOutputsRepository";
import type { IOutputActionsRepository } from "../database/repositories/automations/actions/IOutputActionsRepository";
import type { ISubcontrollersRepository } from "../database/repositories/subcontrollers/ISubcontrollersRepository";
import { AvailableDevice } from "@sproot/common/outputs/AvailableDevice";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";
import { MdnsService } from "../system/MdnsService";
import { IEventBus } from "../eventbus/IEventBus";

const PCA9685_ADDRESSES = Array.from({ length: 64 }, (_, index) =>
  `0x${(0x40 + index).toString(16).toUpperCase()}`,
);
const PCA9685_PINS = Array.from({ length: 16 }, (_, index) => index.toString());

class ESP32_PCA9685 extends MultiOutputBase {
  #mdnsService: MdnsService;

  constructor(
    eventBus: IEventBus,
    outputsRepository: IOutputsRepository,
    outputActionsRepository: IOutputActionsRepository,
    subcontrollersRepository: ISubcontrollersRepository,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    frequency: number = 800,
    logger: winston.Logger,
  ) {
    super(
      eventBus,
      outputsRepository,
      outputActionsRepository,
      subcontrollersRepository,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
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
    const subcontroller = (await this.subcontrollersRepository.getAllAsync()).find(
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
      this.eventBus,
      this.outputsRepository,
      this.outputActionsRepository,
      this.#mdnsService,
      this.maxCacheSize,
      this.initialCacheLookback,
      this.cacheBucketMinutes,
      this.logger,
    );
    (this.usedPins[output.subcontrollerId] as Record<string, string[]>)[output.address]?.push(
      output.pin,
    );
    return this.outputs[output.id];
  }

  override async getAvailableDevices(
    address?: string,
    filterUsed: boolean = true,
    subcontrollerId?: number,
  ): Promise<AvailableDevice[]> {
    const subcontrollers = await this.subcontrollersRepository.getAllAsync();
    const relevantSubcontrollers = subcontrollerId
      ? subcontrollers.filter((device) => device.id === subcontrollerId)
      : subcontrollers;
    const addresses = address ? [address] : PCA9685_ADDRESSES;

    return relevantSubcontrollers.flatMap((device) => {
      const usedAddresses = (this.usedPins[device.id] as Record<string, string[]> | undefined) ?? {};

      return addresses
        .map((candidateAddress) => {
          const usedPins = usedAddresses[candidateAddress] ?? [];
          const availablePins = filterUsed
            ? PCA9685_PINS.filter((pin) => !usedPins.includes(pin))
            : [...PCA9685_PINS];

          return {
            alias: device.name,
            address: candidateAddress,
            pins: availablePins,
            subcontrollerId: device.id,
            externalId: null,
          };
        })
        .filter((availableDevice) => availableDevice.pins.length > 0);
    });
  }

  override async [Symbol.asyncDispose](): Promise<void> {
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
    eventBus: IEventBus,
    outputsRepository: IOutputsRepository,
    outputActionsRepository: IOutputActionsRepository,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ): Promise<ESP32_PCA9685Output> {
    const esp32PCA9685Output = new ESP32_PCA9685Output(
      output,
      subcontroller,
      eventBus,
      outputsRepository,
      outputActionsRepository,
      mdnsService,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
      logger,
    );
    return esp32PCA9685Output.initializeAsync();
  }

  private constructor(
    output: SDBOutput,
    subcontroller: SDBSubcontroller,
    eventBus: IEventBus,
    outputsRepository: IOutputsRepository,
    outputActionsRepository: IOutputActionsRepository,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ) {
    super(
      output,
      eventBus,
      outputsRepository,
      outputActionsRepository,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
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
    await super[Symbol.asyncDispose]();
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
    const response = await fetch(
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
    if (!response.ok) {
      throw new Error(`Failed to set PCA9685 output value. Status: ${response.status}`);
    }
    return;
  }
}

export { ESP32_PCA9685, ESP32_PCA9685Output };
