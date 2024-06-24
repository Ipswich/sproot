import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { IOutputBase, ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { OutputCache } from "./OutputCache";
import { OutputChartData } from "./OutputChartData";
import winston from "winston";
import { OutputState } from "./OutputState";

export abstract class OutputBase implements IOutputBase {
  readonly id: number;
  readonly model: string;
  readonly address: string;
  name: string;
  readonly pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  readonly sprootDB: ISprootDB;
  state: OutputState;
  cache: OutputCache;
  chartData: OutputChartData;
  logger: winston.Logger;
  color: string | null;
  private readonly chartDataPointInterval: number;
  private readonly initialCacheLookback: number;

  private updateMissCount = 0;

  constructor(
    sdbOutput: SDBOutput,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    this.id = sdbOutput.id;
    this.model = sdbOutput.model;
    this.address = sdbOutput.address;
    this.name = sdbOutput.name;
    this.pin = sdbOutput.pin;
    this.isPwm = sdbOutput.isPwm ? true : false;
    this.isInvertedPwm = sdbOutput.isPwm && sdbOutput.isInvertedPwm ? true : false;
    this.sprootDB = sprootDB;
    this.color = sdbOutput.color;
    this.state = new OutputState(sprootDB);
    this.cache = new OutputCache(maxCacheSize, sprootDB, logger);
    this.chartData = new OutputChartData(maxChartDataSize, chartDataPointInterval);
    this.logger = logger;
    this.chartDataPointInterval = Number(chartDataPointInterval);
    this.initialCacheLookback = initialCacheLookback;
  }

  get value(): number {
    return this.state.value;
  }

  get controlMode(): ControlMode {
    return this.state.controlMode;
  }

  /**
   * Executes the current state of the output, setting the physical state of the output to the recorded state
   * (respecting the current ControlMode). This should be called after state.setNewState() to ensure that the
   * physical state of the output is always in sync with the recorded state of the output.
   *
   * See setNewState
   */
  abstract executeState(): void;
  abstract dispose(): void;

  /**
   * Sets a new state to the targeted control mode, and executes it. This keeps the physical state
   * of the output in sync with the logical state.
   * @param newState The new state
   * @param targetControlMode The control mode to apply it to
   */
  setNewState(newState: SDBOutputState, targetControlMode: ControlMode): void {
    this.state.setNewState(newState, targetControlMode);
    this.executeState();
  }

  async updateDataStoresAsync(): Promise<void> {
    this.addCurrentStateToCache();
    const lastCacheData = this.cache.get().slice(-1)[0];
    //Only update chart if the most recent datapoint is N minutes after last cache
    if (this.chartData.shouldUpdateChartData(lastCacheData)) {
      this.updateChartData();
      //Reset miss count if successful
      this.updateMissCount = 0;
    } else {
      //Increment miss count if unsuccessful. Easy CYA if things get out of sync.
      this.updateMissCount++;
      //If miss count exceeds 10 * N, force update (3 real tries, because intervals).
      if (this.updateMissCount >= 3 * this.chartDataPointInterval) {
        this.logger.warn(
          `Chart data update miss count exceeded (3) for output {id: ${this.id}}. Forcing update to re-sync.`,
        );
        this.updateChartData();
        this.updateMissCount = 0;
      }
    }

    try {
      await this.state.addCurrentStateToDatabaseAsync(this.id);
    } catch (error) {
      this.logger.error(`Error adding state to database for output ${this.id}: ${error}`);
    }
  }

  protected addCurrentStateToCache(): void {
    this.cache.addData(this.state.get());
    this.logger.info(
      `Updated cached states for output {id: ${this.id}}. Cache size - ${this.cache.get().length}`,
    );
  }

  async loadCacheFromDatabaseAsync(): Promise<void> {
    try {
      await this.cache.loadCacheFromDatabaseAsync(this.id, this.initialCacheLookback);
      this.logger.info(
        `Loaded cached states for output {id: ${this.id}}. Cache size - ${this.cache.get().length}`,
      );
    } catch (err) {
      this.logger.error(`Failed to load cached states for {id: ${this.id}}. ${err}`);
    }
  }

  getCachedReadings(offset?: number, limit?: number): SDBOutputState[] {
    return this.cache.get(offset, limit);
  }

  loadChartData(): void {
    this.chartData.loadChartData(this.cache.get(), this.name);
    this.logger.info(
      `Loaded chart data for output {id: ${this.id}}. Chart data size - ${this.chartData.get().length}`,
    );
  }

  updateChartData(): void {
    this.chartData.updateChartData(this.cache.get(), this.name);
    this.logger.info(
      `Updated chart data for output {id: ${this.id}}. Chart data size - ${this.chartData.get().length}`,
    );
  }
}
