import { ISprootDB } from "@sproot/database/ISprootDB";
import { ControlMode, IOutputBase } from "@sproot/outputs/IOutputBase";

import winston from "winston";
import { SDBOutputState } from "@sproot/database/SDBOutputState";
import { AvailableDevice } from "@sproot/sproot-common/dist/outputs/AvailableDevice";
import { OutputBase } from "./OutputBase";
import { SDBOutput } from "@sproot/database/SDBOutput";

export abstract class MultiOutputBase {
  readonly boardRecord: Record<string, any> = {};
  readonly outputs: Record<string, OutputBase>;
  readonly usedPins: Record<string, string[]> = {};
  protected sprootDB: ISprootDB;
  protected frequency: number;
  protected maxCacheSize: number;
  protected initialCacheLookback: number;
  protected maxChartDataSize: number;
  protected chartDataPointInterval: number;
  protected logger: winston.Logger;

  constructor(
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    frequency: number = 800,
    logger: winston.Logger,
  ) {
    this.sprootDB = sprootDB;
    this.maxCacheSize = maxCacheSize;
    this.initialCacheLookback = initialCacheLookback;
    this.maxChartDataSize = maxChartDataSize;
    this.chartDataPointInterval = chartDataPointInterval;
    this.frequency = frequency;
    this.logger = logger;
    this.outputs = {};
  }

  abstract createOutputAsync(output: SDBOutput): Promise<IOutputBase | undefined>;
  abstract getAvailableDevices(host?: string): AvailableDevice[];

  get outputData(): Record<string, IOutputBase> {
    const cleanObject: Record<string, IOutputBase> = {};
    for (const key in this.outputs) {
      if (this.outputs[key]) {
        cleanObject[key] = this.outputs[key]?.outputData;
      }
    }
    return cleanObject;
  }

  updateControlMode = (outputId: string, controlMode: ControlMode) =>
    this.outputs[outputId]?.state.updateControlMode(controlMode);

  setNewOutputState = (
    outputId: string,
    newState: SDBOutputState,
    targetControlMode: ControlMode,
  ) => this.outputs[outputId]?.state.setNewState(newState, targetControlMode);

  executeOutputState = (outputId?: string) =>
    outputId
      ? this.outputs[outputId]?.executeState()
      : Object.keys(this.outputs).forEach((key) => this.outputs[key]?.executeState());

  disposeOutput(output: OutputBase): void {
    const usedPins = this.usedPins[output.address];
    if (usedPins) {
      const index = usedPins.indexOf(output.pin);
      if (index !== -1) {
        usedPins.splice(index, 1);
        output.dispose();
        delete this.outputs[output.id];
        if (usedPins.length === 0) {
          delete this.boardRecord[output.address];
          delete this.usedPins[output.address];
        }
      }
    }
  }
}
