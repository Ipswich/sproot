import { Pca9685Driver } from "pca9685";
import { openSync } from "i2c-bus";
import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/common/database/SDBOutput";
import type { IOutputsRepository } from "../database/repositories/outputs/IOutputsRepository";
import type { IOutputActionsRepository } from "../database/repositories/automations/actions/IOutputActionsRepository";
import type { ISubcontrollersRepository } from "../database/repositories/subcontrollers/ISubcontrollersRepository";
import { AvailableDevice } from "@sproot/common/outputs/AvailableDevice";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";
import { IEventBus } from "../eventbus/IEventBus";

const PCA9685_ADDRESSES = Array.from(
  { length: 64 },
  (_, index) => `0x${(0x40 + index).toString(16).toUpperCase()}`,
);
const PCA9685_PINS = Array.from({ length: 16 }, (_, index) => index.toString());

class PCA9685 extends MultiOutputBase {
  constructor(
    eventBus: IEventBus,
    outputsRepository: IOutputsRepository,
    outputActionsRepository: IOutputActionsRepository,
    subcontrollersRepository: ISubcontrollersRepository,
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
  }

  async createOutputAsync(output: SDBOutput): Promise<OutputBase | undefined> {
    //Create new PCA9685 if one doesn't exist for this address.
    if (!this.boardRecord[output.address]) {
      this.boardRecord[output.address] = new Pca9685Driver(
        {
          i2c: openSync(1),
          address: parseInt(output.address),
          frequency: this.frequency,
          debug: false,
        },
        () => {},
      );
      this.usedPins[output.address] = [];
    }

    const pca9685Driver = this.boardRecord[output.address];
    this.outputs[output.id] = await PCA9685Output.createInstanceAsync(
      pca9685Driver as Pca9685Driver, // Type assertion to ensure pca9685Driver is not undefined
      output,
      this.eventBus,
      this.outputsRepository,
      this.outputActionsRepository,
      this.maxCacheSize,
      this.initialCacheLookback,
      this.cacheBucketMinutes,
      this.logger,
    );
    if (Array.isArray(this.usedPins[output.address])) {
      (this.usedPins[output.address] as string[]).push(output.pin);
    }
    return this.outputs[output.id];
  }

  override async getAvailableDevices(
    address?: string,
    filterUsed: boolean = true,
  ): Promise<AvailableDevice[]> {
    const addresses = address ? [address] : PCA9685_ADDRESSES;

    return addresses
      .map((candidateAddress) => {
        const usedPins = Array.isArray(this.usedPins[candidateAddress])
          ? (this.usedPins[candidateAddress] as string[])
          : [];
        const availablePins = filterUsed
          ? PCA9685_PINS.filter((pin) => !usedPins.includes(pin))
          : [...PCA9685_PINS];

        return {
          alias: null,
          address: candidateAddress,
          pins: availablePins,
          subcontrollerId: null,
          externalId: null,
        };
      })
      .filter((device) => device.pins != null && device.pins.length > 0);
  }

  override async [Symbol.asyncDispose](): Promise<void> {
    for (const output of Object.values(this.outputs)) {
      await output[Symbol.asyncDispose]();
    }
  }
}

class PCA9685Output extends OutputBase {
  pca9685: Pca9685Driver;

  static createInstanceAsync(
    pca9685: Pca9685Driver,
    output: SDBOutput,
    eventBus: IEventBus,
    outputsRepository: IOutputsRepository,
    outputActionsRepository: IOutputActionsRepository,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ): Promise<PCA9685Output> {
    const pca9685Output = new PCA9685Output(
      pca9685,
      output,
      eventBus,
      outputsRepository,
      outputActionsRepository,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
      logger,
    );
    return pca9685Output.initializeAsync();
  }

  private constructor(
    pca9685: Pca9685Driver,
    output: SDBOutput,
    eventBus: IEventBus,
    outputsRepository: IOutputsRepository,
    outputActionsRepository: IOutputActionsRepository,
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
    this.pca9685 = pca9685;
  }

  executeStateAsync(forceExecution: boolean = false): Promise<void> {
    return this.executeStateHelperAsync(
      async (value) =>
        new Promise((resolve, reject) => {
          // setDutyCycle takes a decimal value -> 50% == .5; 33% == .33;
          this.pca9685.setDutyCycle(parseInt(this.pin), value / 100, undefined, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(undefined);
            }
          });
        }),
      forceExecution,
    );
  }

  override async [Symbol.asyncDispose](): Promise<void> {
    await super[Symbol.asyncDispose]();
    this.pca9685.setDutyCycle(parseInt(this.pin), 0);
  }
}

export { PCA9685, PCA9685Output };
