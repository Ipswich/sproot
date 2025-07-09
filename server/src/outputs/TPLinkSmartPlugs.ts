import { Client, Plug } from "tplink-smarthome-api";
import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";
import { AvailableDevice } from "@sproot/sproot-common/dist/outputs/AvailableDevice";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

class TPLinkSmartPlugs extends MultiOutputBase implements Disposable {
  readonly availablePlugs: Record<string, Plug> = {};
  #client: Client;

  constructor(
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    super(
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      undefined,
      logger,
    );
    this.#client = new Client();

    this.#client.on("plug-new", (plug: Plug) => {
      if (plug.childId != undefined) {
        this.availablePlugs[plug.childId] = plug;
      }
    });
    this.#client.on("plug-online", (plug: Plug) => {
      if (plug.childId != undefined) {
        this.availablePlugs[plug.childId] = plug;
      }
    });
    this.#client.on("plug-offline", (plug: Plug) => {
      if (plug.childId != undefined) {
        delete this.availablePlugs[plug.childId];
      }
    });

    this.#client.on("error", (error: unknown) => {
      this.logger.error(`TPLink Smart Plug client error: ${error}`);
    });
    this.#client.on("discovery-invalid", (error: unknown) => {
      this.logger.error(`TPLink Smart Plug client error: ${error}`);
    });
    this.#client.startDiscovery();
  }

  getHosts(): string[] {
    return [...new Set(Object.values(this.availablePlugs).map((plug) => plug.host))];
  }

  getAvailableDevices(host?: string, filterUsed: boolean = true): AvailableDevice[] {
    let plugs = Object.values(this.availablePlugs);

    if (host != undefined) {
      plugs = plugs.filter((plug) => plug.host == host && plug.childId !== undefined);
    } else {
      plugs = plugs.filter((plug) => plug.childId !== undefined);
    }

    if (filterUsed) {
      plugs = plugs.filter((plug) => !(this.usedPins[plug.host] ?? []).includes(plug.childId!));
    }

    return plugs.map((plug) => ({
      alias: plug.alias,
      address: plug.host,
      externalId: plug.childId!,
    }));
  }

  async createOutputAsync(output: SDBOutput): Promise<OutputBase | undefined> {
    if (!this.boardRecord[output.address]) {
      this.boardRecord[output.address] = [];
      this.boardRecord[output.address].push(output.pin);
      this.usedPins[output.address] = [];
    }

    const plug = this.#client.devices.get(output.pin);
    if (plug == undefined) {
      throw new Error("TPLink Smart Plug device could not be found creation failed");
    }
    this.outputs[output.id] = new TPLinkPlug(
      plug as Plug,
      output,
      this.sprootDB,
      this.maxCacheSize,
      this.initialCacheLookback,
      this.maxChartDataSize,
      this.chartDataPointInterval,
      this.logger,
    );
    await this.outputs[output.id]?.initializeAsync();
    this.usedPins[output.address]?.push(output.pin);
    return this.outputs[output.id];
  }

  [Symbol.dispose](): void {
    this.#client.removeAllListeners();
    this.#client.stopDiscovery();
  }
}

class TPLinkPlug extends OutputBase {
  tplinkPlug: Plug;
  #isUpdating: boolean = false;

  constructor(
    tplinkPlug: Plug,
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
    this.tplinkPlug = tplinkPlug;
  }

  async executeStateAsync(): Promise<void> {
    // Add some ddos protection for things - turns out sending too many commands too quickly
    // can cause some issues for the some devices.
    if (this.#isUpdating) {
      return;
    }
    try {
      this.#isUpdating = true;
      await this.executeStateHelperAsync(async (value) => {
        await this.tplinkPlug.setPowerState(!!value);
      });
    } finally {
      this.#isUpdating = false;
    }
  }

  dispose(): void {
    if (this.controlMode == ControlMode.automatic) {
      // Catch this so it doesn't blow up
      this.tplinkPlug.setPowerState(false).catch(() => {
        this.logger.error(`Disposal error turning off TPLink Smart Plug ${this.id}`);
      });
    }
  }
}
export { TPLinkSmartPlugs, TPLinkPlug };
