import { Client, Plug } from "tplink-smarthome-api";
import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";
import { AvailableDevice } from "@sproot/sproot-common/dist/outputs/AvailableDevice";
import { ControlMode } from "@sproot/outputs/IOutputBase";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";

class TPLinkSmartPlugs extends MultiOutputBase {
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
    this.#client = new Client({ defaultSendOptions: { timeout: 1000, transport: "tcp" } });

    this.#client.on("plug-new", (plug) => {
      if (plug.childId != undefined) {
        this.availablePlugs[plug.childId] = plug;
      }
    });
    this.#client.on("plug-online", (plug) => {
      if (plug.childId != undefined) {
        this.availablePlugs[plug.childId] = plug;
      }
    });
    this.#client.on("plug-offline", (plug) => {
      if (plug.childId != undefined) {
        delete this.availablePlugs[plug.childId];
      }
    });

    this.#client.on("error", (error) => {
      this.logger.error(`TPLink Smart Plug client error: ${error}`);
    });
    this.#client.on("discovery-invalid", (error) => {
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

    const plug = await this.#client.getDevice({ host: output.address, childId: output.pin });
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
    // Set state from switch
    this.outputs[output.id]?.setNewState(
      {
        controlMode: ControlMode.manual,
        value: (await plug.getPowerState()) ? 100 : 0,
        logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      } as SDBOutputState,
      ControlMode.manual,
    );
    await this.outputs[output.id]?.initializeAsync();
    this.usedPins[output.address]?.push(output.pin);
    return this.outputs[output.id];
  }

  [Symbol.dispose](): void {
    this.#client.stopDiscovery();
  }
}

class TPLinkPlug extends OutputBase {
  tplinkPlug: Plug;

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
    tplinkPlug.on("power-on", () => {
      this.setNewState(
        {
          controlMode: ControlMode.manual,
          value: 100,
          logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
        } as SDBOutputState,
        ControlMode.manual,
      );
    });
    tplinkPlug.on("power-off", () => {
      this.setNewState(
        {
          controlMode: ControlMode.manual,
          value: 0,
          logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
        } as SDBOutputState,
        ControlMode.manual,
      );
    });

    this.tplinkPlug = tplinkPlug;
  }

  executeState(): void {
    this.executeStateHelper((value) => {
      this.tplinkPlug.setPowerState(!!value);
    });
  }

  override [Symbol.dispose](): void {
    this.tplinkPlug.removeAllListeners("power-on");
    this.tplinkPlug.removeAllListeners("power-off");
    this.tplinkPlug.setPowerState(false);
  }
}
export { TPLinkSmartPlugs, TPLinkPlug };
