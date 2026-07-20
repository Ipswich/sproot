import { Pca9685Driver } from "pca9685";
import { openSync } from "i2c-bus";
import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { AvailableDevice } from "@sproot/sproot-common/dist/outputs/AvailableDevice";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";
import { IEventBus } from "../eventbus/IEventBus";

class PCA9685 extends MultiOutputBase {
  constructor(
    eventBus: IEventBus,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    frequency: number = 800,
    logger: winston.Logger,
  ) {
    super(
      eventBus,
      sprootDB,
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
      this.sprootDB,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override getAvailableDevices(_address?: string): AvailableDevice[] {
    return [];
    // const childIds = Array.from({ length: 16 }, (_, i) => i.toString());
    // return childIds.filter((childId) => !this.usedPins[address]?.includes(childId));
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
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ): Promise<PCA9685Output> {
    const pca9685Output = new PCA9685Output(
      pca9685,
      output,
      eventBus,
      sprootDB,
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
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ) {
    super(
      output,
      eventBus,
      sprootDB,
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
