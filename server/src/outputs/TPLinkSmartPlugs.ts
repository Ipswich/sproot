import { Client, Plug } from "tplink-smarthome-api"
import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";

class TPLinkSmartPlugs extends MultiOutputBase {
  readonly availablePlugs: Record<string, Plug> = {}
  #client: Client;

  constructor(
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger
  ) {
    super(sprootDB, maxCacheSize, initialCacheLookback, maxChartDataSize, chartDataPointInterval, undefined, logger)
    this.#client = new Client({ defaultSendOptions: { timeout: 500, transport: 'tcp' } })

    this.#client.on("plug-online", (plug) => {
      if (plug.childId != undefined) {
        this.availablePlugs[plug.childId] = plug;
      }
    })
    this.#client.on("plug-offline", (plug => {
      if (plug.childId != undefined) {
        delete this.availablePlugs[plug.childId]
      }
    }))
    setInterval(() => {
      console.log(this.availablePlugs)
    }, 3000);
  }

  getHosts(): string[] {
    return [... new Set(Object.values(this.availablePlugs).map(plug => plug.host))]
  }

  getAvailableChildIds(host: string): string[] {
    const usedIds = Object.values(this.outputs).map(plug => (plug as TPLinkPlug).tplinkPlug.childId);
    return Object.values(this.availablePlugs)
      .filter(plug => plug.host == host && plug.childId != undefined && !usedIds.includes(plug.childId))
      .map(plug => plug.childId!)
  }

  async createOutputAsync(output: SDBOutput): Promise<OutputBase | undefined> {
    const plug = await this.#client.getDevice({ host: output.address, childId: output.pin })
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
    return this.outputs[output.id];
  }

  dispose(): void {
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
    this.tplinkPlug = tplinkPlug;
  }

  executeState(): void {
    this.executeStateHelper((value) => {
      this.tplinkPlug.setPowerState(!!value);
    });
  }

  dispose = () => {
    this.tplinkPlug.setPowerState(false);
  };
}
export {TPLinkSmartPlugs, TPLinkPlug}