import { Client, Plug } from "tplink-smarthome-api";
import { OutputBase } from "./base/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { MultiOutputBase } from "./base/MultiOutputBase";
import { AvailableDevice } from "@sproot/sproot-common/dist/outputs/AvailableDevice";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { EventEmitter } from "events";
import { toDbDate } from "../utils/dateUtils";
import { AutomationService } from "../automation/AutomationService";

class TPLinkSmartPlugs extends MultiOutputBase {
  readonly plugRegistry = new PlugRegistry();
  readonly initializingPlugs: Record<string, string[]> = {};
  #client: Client;

  constructor(
    automationService: AutomationService,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
    connectionTimeout: number = 5000,
  ) {
    super(
      automationService,
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
        transport: "tcp",
        useSharedSocket: true,
        sharedSocketTimeout: connectionTimeout,
      },
    });

    this.#client.on("plug-new", (plug: Plug) => {
      if (plug.childId != undefined) {
        this.plugRegistry.register(plug);
      }
    });
    this.#client.on("plug-online", (plug: Plug) => {
      if (plug.childId != undefined) {
        this.plugRegistry.register(plug);
      }
    });
    this.#client.on("plug-offline", async (plug: Plug) => {
      // Clean up non-responsive plugs
      if (plug.childId != undefined) {
        this.plugRegistry.unregister(plug.childId);
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
    return [...new Set(this.plugRegistry.getAll().map((plug) => plug.host))];
  }

  getAvailableDevices(host?: string, filterUsed: boolean = true): AvailableDevice[] {
    let plugs = this.plugRegistry.getAll();

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

      this.outputs[output.id] = await TPLinkPlug.createInstanceAsync(
        this.plugRegistry,
        output,
        this.automationService,
        this.sprootDB,
        this.maxCacheSize,
        this.initialCacheLookback,
        this.maxChartDataSize,
        this.chartDataPointInterval,
        this.logger,
      );
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

  override async [Symbol.asyncDispose](): Promise<void> {
    for (const output of Object.values(this.outputs)) {
      await output[Symbol.asyncDispose]();
    }
    this.plugRegistry.removeAllListeners();
    this.#client.removeAllListeners();
    this.#client.stopDiscovery();
  }
}

class TPLinkPlug extends OutputBase {
  plugRegistry: PlugRegistry;
  tplinkPlug: Plug | undefined;
  #powerUpdateEventRunning = false;

  static createInstanceAsync(
    plugRegistry: PlugRegistry,
    output: SDBOutput,
    automationService: AutomationService,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ): Promise<TPLinkPlug> {
    const tplinkSmartPlug = new TPLinkPlug(
      plugRegistry,
      output,
      automationService,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger,
    );
    return tplinkSmartPlug.initializeAsync();
  }

  private constructor(
    plugRegistry: PlugRegistry,
    output: SDBOutput,
    automationService: AutomationService,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    super(
      output,
      automationService,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger,
    );
    this.plugRegistry = plugRegistry;

    const existingPlug = this.plugRegistry.get(output.pin);
    if (existingPlug) {
      this.#attach(existingPlug);
    }

    this.plugRegistry.on("registered", this.#onPlugAdded);
    this.plugRegistry.on("unregistered", this.#onPlugRemoved);
  }

  async executeStateAsync(forceExecution: boolean = false): Promise<void> {
    if (!this.tplinkPlug) {
      this.logger.error(
        `TPLink Smart Plug ${this.id} is not currently registered. Cannot execute state.`,
      );
      return;
    }
    await this.executeStateHelperAsync(async (value) => {
      const targetState = !!value;
      let retryCount = 0;
      let result = false;
      while (!result && retryCount < 3) {
        try {
          retryCount++;
          result = await this.tplinkPlug!.setPowerState(targetState, { timeout: 800 });
        } catch (error) {
          this.logger.error(
            `Error setting power state for TPLink Smart Plug ${this.id}: ${error}. Retrying ...`,
          );
        }
      }
      if (!result) {
        throw new Error(
          `Failed to set power state for TPLink Smart Plug ${this.id} after 3 attempts.`,
        );
      }
    }, forceExecution);
  }

  override async [Symbol.asyncDispose](): Promise<void> {
    await super[Symbol.asyncDispose]();
    this.plugRegistry.off("registered", this.#onPlugAdded);
    this.plugRegistry.off("unregistered", this.#onPlugRemoved);
    this.tplinkPlug?.removeAllListeners("power-on");
    this.tplinkPlug?.removeAllListeners("power-off");

    if (this.controlMode == ControlMode.automatic) {
      // Catch this so it doesn't blow up
      this.tplinkPlug?.setPowerState(false).catch(() => {
        this.logger.error(`Disposal error turning off TPLink Smart Plug ${this.id}`);
      });
    }
  }

  #onPlugAdded = (plug: Plug) => {
    if (plug.childId !== this.pin) {
      return;
    }
    this.#attach(plug);
  };

  #onPlugRemoved = (plug: Plug) => {
    if (plug.childId !== this.pin) {
      return;
    }
    this.#detach(plug);
  };

  #attach(plug: Plug) {
    this.tplinkPlug = plug;
    plug.on("power-on", async () => {
      await this.#powerUpdateFunctionAsync(true);
    });
    plug.on("power-off", async () => {
      await this.#powerUpdateFunctionAsync(false);
    });
  }

  #detach(plug: Plug) {
    plug.removeAllListeners("power-on");
    plug.removeAllListeners("power-off");
    if (this.tplinkPlug === plug) {
      this.tplinkPlug = undefined;
    }
  }

  async #powerUpdateFunctionAsync(value: boolean): Promise<void> {
    // This should make sure that if someone externally changes the power state of the plug when it's
    // in manual mode, it updates the state in Sproot. Otherwise, we'll just ignore it.
    if (this.#powerUpdateEventRunning) {
      this.logger.debug(
        `TPLink Smart Plug {id: ${this.id}, pin: ${this.pin}} is already processing a power update event. ` +
          `Ignoring duplicate event for state ${value ? 100 : 0}.`,
      );
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
            logTime: toDbDate(),
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

class PlugRegistry extends EventEmitter {
  private plugs = new Map<string, Plug>();

  register(plug: Plug) {
    if (!plug.childId || this.plugs.has(plug.childId)) {
      return;
    }

    this.plugs.set(plug.childId, plug);
    this.emit("registered", plug);
  }

  unregister(childId: string) {
    const plug = this.plugs.get(childId);
    if (!plug) {
      return;
    }

    this.plugs.delete(childId);
    this.emit("unregistered", plug);
  }

  get(childId: string): Plug | undefined {
    return this.plugs.get(childId);
  }

  getAll(): Plug[] {
    return Array.from(this.plugs.values());
  }
}

export { TPLinkSmartPlugs, TPLinkPlug };
