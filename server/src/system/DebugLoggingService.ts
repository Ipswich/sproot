import winston from "winston";
import { ISettingsRepository } from "../database/settings/ISettingsRepository";
import { SETTINGS } from "../database/settings/SettingsSchema";
import { IEventBus, Unsubscribe } from "../eventbus/IEventBus";
import { Events } from "../eventbus/events/Events";
import { DebugLoggingController } from "../logger";

export class DebugLoggingService {
  readonly #debugLoggingController: DebugLoggingController;
  readonly #logger: winston.Logger;
  readonly #unsubscribe: Unsubscribe;

  static async createInstanceAsync(
    settingsRepository: ISettingsRepository,
    eventBus: IEventBus,
    debugLoggingController: DebugLoggingController,
    logger: winston.Logger,
  ): Promise<DebugLoggingService> {
    const service = new DebugLoggingService(eventBus, debugLoggingController, logger);
    const value = await settingsRepository.getAsync(SETTINGS.system.log_debug);
    service.#applySetting(value === true);
    return service;
  }

  private constructor(
    eventBus: IEventBus,
    debugLoggingController: DebugLoggingController,
    logger: winston.Logger,
  ) {
    this.#debugLoggingController = debugLoggingController;
    this.#logger = logger;
    this.#unsubscribe = eventBus.subscribe(Events.SYSTEM_LOG_DEBUG_UPDATED, (event) => {
      this.#applySetting(event.payload.value);
    });
  }

  [Symbol.dispose](): void {
    this.#unsubscribe();
  }

  #applySetting(enabled: boolean): void {
    const changed = this.#debugLoggingController.setEnabled(enabled);
    if (changed) {
      this.#logger.info(`Debug logging ${enabled ? "enabled" : "disabled"}.`);
    }
  }
}
