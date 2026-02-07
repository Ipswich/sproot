import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { OutputBase } from "./base/OutputBase";
import { SDBOutputState } from "@sproot/database/SDBOutputState";
import { ControlMode } from "@sproot/outputs/IOutputBase";

export class OutputGroup extends OutputBase {
  readonly outputs: { [outputId: number]: OutputBase } = {};

  static async createInstanceAsync(
    output: SDBOutput,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ): Promise<OutputGroup> {
    const outputGroup = new OutputGroup(
      output,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger,
    );

    return outputGroup.initializeAsync();
  }

  private constructor(
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

  async setOutputAsync(output: OutputBase) {
    this.outputs[output.id] = output;
    this.isPwm = this.#shouldPwmBeEnabled();
    // If we change Pwm state, we want to update group output value (rounding).
    // Child outputs shouldn't need to have their state updated since this is only relevant
    // when going from pwm to non-pwm.
    await super.setStateAsync(this.state.get());

    // Immediately sync state and control mode of new output.
    await output.setStateAsync(this.state.get());
    await output.updateControlModeAsync(this.state.controlMode);
    await output.executeStateAsync();
  }

  removeOutputAsync(outputId: number) {
    if (!this.outputs[outputId]) {
      return Promise.resolve();
    }
    delete this.outputs[outputId];
    this.isPwm = this.#shouldPwmBeEnabled();
    // If we change from pwm to not, we want to update group output value (rounding).
    // Child outputs shouldn't need to have their state updated since this is only relevant
    // when going from pwm to non-pwm.
    super.setStateAsync(this.state.get());
  }

  override setStateAsync(newState: SDBOutputState): Promise<void> {
    return this.#runFunctionOnAllOutputsAsync(
      (output) => output.setStateAsync(newState),
      () => super.setStateAsync(newState),
    );
  }

  override updateControlModeAsync(controlMode: ControlMode): Promise<void> {
    return this.#runFunctionOnAllOutputsAsync(
      (output) => output.updateControlModeAsync(controlMode),
      () => super.updateControlModeAsync(controlMode),
    );
  }

  executeStateAsync(forceExecution: boolean = false): Promise<void> {
    return this.executeStateHelperAsync(
      (_) => this.#runFunctionOnAllOutputsAsync((output) => output.executeStateAsync()),
      forceExecution,
    );
  }

  async [Symbol.asyncDispose](): Promise<void> {
    for (const output of Object.values(this.outputs)) {
      await this.removeOutputAsync(output.id);
    }
    return;
  }

  async #runFunctionOnAllOutputsAsync(
    runOnOtherFunc: (output: OutputBase) => Promise<void>,
    runOnSelfFunc?: () => Promise<void>,
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const output of Object.values(this.outputs)) {
      promises.push(runOnOtherFunc(output));
    }
    if (runOnSelfFunc) {
      promises.push(runOnSelfFunc());
    }
    await Promise.all(promises);
  }

  #shouldPwmBeEnabled(): boolean {
    for (const output of Object.values(this.outputs)) {
      if (output.isPwm) {
        return true;
      }
    }
    return false;
  }
}
