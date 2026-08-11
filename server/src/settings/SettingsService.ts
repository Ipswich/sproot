import { AnySprootEvent, IEventBus } from "../eventbus/IEventBus";
import { EventMap } from "../eventbus/events/EventMap";
import { Events } from "../eventbus/events/Events";
import { ISettingsRepository } from "../database/settings/ISettingsRepository";
import type { SettingsKey, SettingsSchema } from "../database/settings/SettingsSchema";

export class SettingsService {
  readonly #settingEventMap: Record<SettingsKey, keyof EventMap | undefined> = {
    "sensors.data_retention": Events.SENSOR_RETENTION_UPDATED,
    "outputs.data_retention": Events.OUTPUT_RETENTION_UPDATED,
    "system.backup_retention": Events.BACKUP_RETENTION_UPDATED,
    "system.latitude": Events.SYSTEM_LATITUDE_UPDATED,
    "system.longitude": Events.SYSTEM_LONGITUDE_UPDATED,
  };

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
    const eventType = this.#settingEventMap[key];
    if (eventType) {
      await this.#eventBus.publishAsync({
        type: eventType,
        payload: { key: key as string, value: value ?? null },
        eventId: crypto.randomUUID(),
        occurredAt: new Date(),
      } as AnySprootEvent);
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
