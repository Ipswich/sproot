import { Client, Plug } from "tplink-smarthome-api";
import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";
import { AvailableDevice } from "@sproot/sproot-common/dist/outputs/AvailableDevice";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { MdnsService } from "../system/MdnsService";

class TPLinkSmartPlugs extends MultiOutputBase {
  readonly availablePlugs: Record<string, Plug> = {};
  readonly initializingPlugs: Record<string, string[]> = {};
  #client: Client;

  constructor(
    sprootDB: ISprootDB,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
    connectionTimeout: number = 5000,
  ) {
    super(
      sprootDB,
      mdnsService,
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
    this.#client.on("plug-offline", async (plug: Plug) => {
      // Clean up non-responsive plugs
      if (plug.childId != undefined) {
        delete this.availablePlugs[plug.childId];
        const device = Object.values(this.outputs).find((o) => o.pin == plug.childId);
        if (device) {
          await this.disposeOutputAsync(device);
        }
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
      plugs = plugs.filter((plug) => {
        const usedForHost = Array.isArray(this.usedPins[plug.host])
          ? (this.usedPins[plug.host] as string[])
          : [];
        return !usedForHost.includes(plug.childId!);
      });
    }

    return plugs.map((plug) => ({
      alias: plug.alias,
      address: plug.host,
      externalId: plug.childId!,
    }));
  }

  async createOutputAsync(output: SDBOutput): Promise<OutputBase | undefined> {
    // Add a bit of a delay, just in case the discovery hasn't found anything yet
    // Basically "If we don't have this key, wait 500ms and check again. Then, if
    // it ain't there, it ain't there."
    if (Object.keys(this.availablePlugs).indexOf(output.pin) == -1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (Object.keys(this.availablePlugs).indexOf(output.pin) == -1) {
        this.logger.warn(`TPLink Smart Plug ${output.id} could not be located. Skipping creation.`);
        return undefined;
      }
    }

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

      const plug = this.availablePlugs[output.pin]!;

      this.outputs[output.id] = new TPLinkPlug(
        plug,
        output,
        this.sprootDB,
        this.mdnsService,
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
      if (Array.isArray(this.usedPins[output.address])) {
        (this.usedPins[output.address] as string[]).push(output.pin);
      }
      this.initializingPlugs[output.address] = this.initializingPlugs[output.address]!.filter(
        (pin) => pin !== output.pin,
      );
    }
    return this.outputs[output.id];
  }

  async [Symbol.asyncDispose](): Promise<void> {
    for (const output of Object.values(this.outputs)) {
      await output[Symbol.asyncDispose]();
    }
    this.#client.removeAllListeners();
    this.#client.stopDiscovery();
  }
}

class TPLinkPlug extends OutputBase {
  tplinkPlug: Plug;
  #powerUpdateEventRunning = false;

  constructor(
    tplinkPlug: Plug,
    output: SDBOutput,
    sprootDB: ISprootDB,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    super(
      output,
      sprootDB,
      mdnsService,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger,
    );
    this.tplinkPlug = tplinkPlug;

    this.tplinkPlug.on("power-on", async () => {
      await this.#powerUpdateFunctionAsync(true);
    });
    this.tplinkPlug.on("power-off", async () => {
      await this.#powerUpdateFunctionAsync(false);
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

  override async [Symbol.asyncDispose](): Promise<void> {
    this.tplinkPlug.removeAllListeners("power-on");
    this.tplinkPlug.removeAllListeners("power-off");

    if (this.controlMode == ControlMode.automatic) {
      // Catch this so it doesn't blow up
      this.tplinkPlug.setPowerState(false).catch(() => {
        this.logger.error(`Disposal error turning off TPLink Smart Plug ${this.id}`);
      });
    }
  }

  async #powerUpdateFunctionAsync(value: boolean): Promise<void> {
    // This should make sure that if someone externally changes the power state of the plug when it's
    // in manual mode, it updates the state in Sproot. Otherwise, we'll just ignore it.
    if (this.#powerUpdateEventRunning) {
      return;
    }
    let retryCount = 0;
    this.#powerUpdateEventRunning = true;
    while (retryCount < 3) {
      retryCount++;
      try {
        if (this.controlMode == ControlMode.manual) {
          this.logger.info(
            `TPLink Smart Plug {id: ${this.id}} state change detected. Updating manual state to ${value ? 100 : 0} to reflect this.`,
          );
          await this.state.setNewStateAsync({
            value: value ? 100 : 0,
            controlMode: ControlMode.manual,
            logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
          });
        } else {
          this.logger.info(
            `TPLink Smart Plug {id: ${this.id}} state change detected. Overwriting external { state: ${value ? 100 : 0} } with internal { state: ${this.value} }. This may be redundant, but better safe than sorry.`,
          );
          await this.executeStateAsync(true);
        }
        break;
      } catch (error) {
        this.logger.error(
          `Error updating state for TPLink Smart Plug {id: ${this.id}}: ${error}. Retrying (${retryCount}). . .`,
        );
      }
    }
    this.#powerUpdateEventRunning = false;
    if (retryCount >= 3) {
      this.logger.error(
        `POTENTIAL STATE MISMATCH DETECTED! TPLink Smart Plug {id: ${this.id}} failed to update from power update event after 3 tries!`,
      );
    }
  }
}

export { TPLinkSmartPlugs, TPLinkPlug };
