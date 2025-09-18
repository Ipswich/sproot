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
  readonly initializingPlugs: Record<string, string[]> = {};
  #client: Client;

  constructor(
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
    connectionTimeout: number = 5000,
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
    this.#client = new Client({
      defaultSendOptions: {
        timeout: connectionTimeout,
        transport: "udp",
        useSharedSocket: true,
        sharedSocketTimeout: connectionTimeout,
      },
    });

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
    this.#client.startDiscovery({ deviceTypes: ["plug"] });
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
    if (this.initializingPlugs[output.address]?.includes(output.pin)) {
      this.logger.warn(
        `TPLink Smart Plug ${output.id} is already being initialized. Skipping creation.`,
      );
      return undefined;
    }
    try {
      this.initializingPlugs[output.address] ??= [];
      this.initializingPlugs[output.address]?.push(output.pin);

      if (!this.boardRecord[output.address]) {
        this.boardRecord[output.address] = [];
        this.boardRecord[output.address].push(output.pin);
        this.usedPins[output.address] = [];
      }

      const plug = (await this.#client.getDevice({
        host: output.address,
        childId: output.pin,
      })) as Plug;

      this.outputs[output.id] = new TPLinkPlug(
        plug,
        output,
        this.sprootDB,
        this.maxCacheSize,
        this.initialCacheLookback,
        this.maxChartDataSize,
        this.chartDataPointInterval,
        this.logger,
      );
      await this.outputs[output.id]?.initializeAsync();
    } catch (error) {
      this.logger.error(
        `Error creating TPLink Smart Plug output {id: ${output.id}, name: ${output.name}}: ${error}`,
      );
    } finally {
      this.usedPins[output.address]?.push(output.pin);
      this.initializingPlugs[output.address] = this.initializingPlugs[output.address]!.filter(
        (pin) => pin !== output.pin,
      );
      return this.outputs[output.id];
    }
  }

  [Symbol.dispose](): void {
    for (const output of Object.values(this.outputs)) {
      output.dispose();
    }
    this.#client.removeAllListeners();
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
    this.tplinkPlug.on("power-on", () => {
      this.#powerUpdateFunctionAsync(true);
    });
    this.tplinkPlug.on("power-off", () => {
      this.#powerUpdateFunctionAsync(false);
    });
  }

  async executeStateAsync(forceExecution: boolean = false): Promise<void> {
    await this.executeStateHelperAsync(async (value) => {
      let result = false;
      let retryCount = 0;
      while (!result && retryCount < 3) {
        try {
          retryCount++;
          result = await this.tplinkPlug.setPowerState(!!value, { timeout: 800 });
        } catch (error) {
          this.logger.error(
            `Error setting power state for TPLink Smart Plug ${this.id}: ${error}. Retrying ...`,
          );
        }
      }
    }, forceExecution);
  }

  dispose(): void {
    if (this.controlMode == ControlMode.automatic) {
      // Catch this so it doesn't blow up
      this.tplinkPlug.setPowerState(false).catch(() => {
        this.logger.error(`Disposal error turning off TPLink Smart Plug ${this.id}`);
      });
    }
    this.tplinkPlug.removeAllListeners("power-on");
    this.tplinkPlug.removeAllListeners("power-off");
  }

  async #powerUpdateFunctionAsync(value: boolean): Promise<void> {
    // This should make sure that if someone externally changes the power state of the plug when it's
    // in manual mode, it updates the state in Sproot. Otherwise, we'll just ignore it.
    let retryCount = 0;
    while (retryCount < 3) {
      retryCount++;
      try {
        if (this.controlMode == ControlMode.manual) {
          this.logger.info(
            `TPLink Smart Plug ${this.id} updated from external call. Updating manual state to ${value} to reflect these changes.`,
          );
          await this.state.setNewStateAsync({
            value: value ? 100 : 0,
            controlMode: ControlMode.manual,
            logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
          });
          break;
        } else {
          this.logger.info(
            `TPLink Smart Plug ${this.id} updated from external call. Overriding external { state: ${value} } with internal { state: ${this.value} }.`,
          );
          await this.executeStateAsync(true);
          break;
        }
      } catch (error) {
        this.logger.error(
          `Error updating state from external for TPLink Smart Plug ${this.id}: ${error}. Retrying (${retryCount}). . .`,
        );
      }
    }
    if (retryCount >= 3) {
      this.logger.error(
        `POTENTIAL STATE MISMATCH DETECTED! TPLink Smart Plug ${this.id} failed to update from external call after 3 tries!`,
      );
    }
  }
}

export { TPLinkSmartPlugs, TPLinkPlug };
