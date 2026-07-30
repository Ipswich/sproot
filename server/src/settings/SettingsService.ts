import { AnySprootEvent, IEventBus } from "../eventbus/IEventBus";
import { EventMap } from "../eventbus/events/EventMap";
import { Events } from "../eventbus/events/Events";
import { ISettingsRepository } from "../database/settings/ISettingsRepository";
import type { SettingsKey, SettingsSchema } from "../database/settings/SettingsSchema";

export class SettingsService {
  readonly #settingEventMap: Record<SettingsKey, keyof EventMap | undefined> = {
    "sensors.raw_retention": Events.SENSOR_RETENTION_UPDATED,
    "sensors.5m_agg_retention": Events.SENSOR_RETENTION_UPDATED,
    "sensors.1h_agg_retention": Events.SENSOR_RETENTION_UPDATED,
    "sensors.1d_agg_retention": Events.SENSOR_RETENTION_UPDATED,
    "outputs.raw_retention": Events.OUTPUT_RETENTION_UPDATED,
    "outputs.5m_agg_retention": Events.OUTPUT_RETENTION_UPDATED,
    "outputs.1h_agg_retention": Events.OUTPUT_RETENTION_UPDATED,
    "outputs.1d_agg_retention": Events.OUTPUT_RETENTION_UPDATED,
    "system.backup_retention": Events.BACKUP_RETENTION_UPDATED,
  };

  constructor(
    private repo: ISettingsRepository,
    private eventBus?: IEventBus,
  ) {}

  getAllAsync(): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>> {
    return this.repo.getAllAsync();
  }

  getAsync<K extends SettingsKey>(key: K): Promise<SettingsSchema[K] | undefined> {
    return this.repo.getAsync(key);
  }

  getManyAsync(
    keys: SettingsKey[],
  ): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>> {
    return this.repo.getManyAsync(keys);
  }

  async setAsync<K extends SettingsKey>(key: K, value: SettingsSchema[K]): Promise<void> {
    await this.repo.setAsync(key, value);
    const eventType = this.#settingEventMap[key];
    if (eventType && this.eventBus) {
      await this.eventBus.publishAsync({
        type: eventType,
        payload: { key: key as string, value: value as string },
        eventId: crypto.randomUUID(),
        occurredAt: new Date(),
      } as AnySprootEvent);
    }
  }

  existsAsync(key: string): Promise<boolean> {
    return this.repo.existsAsync(key);
  }

  deleteAsync(key: string): Promise<void> {
    return this.repo.deleteAsync(key);
  }

  syncDefaultsAsync(): Promise<void> {
    return this.repo.syncDefaultsAsync();
  }
}
