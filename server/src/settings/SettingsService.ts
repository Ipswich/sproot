import { AnySprootEvent, createEvent, IEventBus } from "../eventbus/IEventBus";
import { Events } from "../eventbus/events/Events";
import { ISettingsRepository } from "../database/settings/ISettingsRepository";
import { SETTINGS, type SettingsKey, type SettingsSchema } from "../database/settings/SettingsSchema";

export class SettingsService {
  readonly #settingsRepo: ISettingsRepository;
  readonly #eventBus: IEventBus;

  constructor(settingsRepo: ISettingsRepository, eventBus: IEventBus) {
    this.#settingsRepo = settingsRepo;
    this.#eventBus = eventBus;
  }

  getAllAsync(): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>> {
    return this.#settingsRepo.getAllAsync();
  }

  getAsync<K extends SettingsKey>(key: K): Promise<SettingsSchema[K] | undefined> {
    return this.#settingsRepo.getAsync(key);
  }

  getManyAsync(
    keys: SettingsKey[],
  ): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>> {
    return this.#settingsRepo.getManyAsync(keys);
  }

  async setAsync<K extends SettingsKey>(key: K, value: SettingsSchema[K]): Promise<void> {
    await this.#settingsRepo.setAsync(key, value);
    const event = this.#createUpdatedEvent(key, value);
    if (event) {
      await this.#eventBus.publishAsync(event);
    }
  }

  #createUpdatedEvent(key: SettingsKey, value: SettingsSchema[SettingsKey]): AnySprootEvent {
    switch (key) {
      case SETTINGS.sensors.data_retention:
        return createEvent(Events.SENSOR_RETENTION_UPDATED, {
          key,
          value: value as SettingsSchema[typeof SETTINGS.sensors.data_retention],
        });
      case SETTINGS.outputs.data_retention:
        return createEvent(Events.OUTPUT_RETENTION_UPDATED, {
          key,
          value: value as SettingsSchema[typeof SETTINGS.outputs.data_retention],
        });
      case SETTINGS.system.backup_retention:
        return createEvent(Events.BACKUP_RETENTION_UPDATED, {
          key,
          value: value as SettingsSchema[typeof SETTINGS.system.backup_retention],
        });
      case SETTINGS.system.log_debug:
        return createEvent(Events.SYSTEM_LOG_DEBUG_UPDATED, {
          key,
          value: value as SettingsSchema[typeof SETTINGS.system.log_debug],
        });
      case SETTINGS.system.latitude:
        return createEvent(Events.SYSTEM_LATITUDE_UPDATED, {
          key,
          value: value as SettingsSchema[typeof SETTINGS.system.latitude],
        });
      case SETTINGS.system.longitude:
        return createEvent(Events.SYSTEM_LONGITUDE_UPDATED, {
          key,
          value: value as SettingsSchema[typeof SETTINGS.system.longitude],
        });
    }
  }

  existsAsync(key: string): Promise<boolean> {
    return this.#settingsRepo.existsAsync(key);
  }

  deleteAsync(key: string): Promise<void> {
    return this.#settingsRepo.deleteAsync(key);
  }

  syncDefaultsAsync(): Promise<void> {
    return this.#settingsRepo.syncDefaultsAsync();
  }
}
