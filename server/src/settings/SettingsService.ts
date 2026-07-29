import { ISettingsRepository } from "../database/settings/ISettingsRepository";
import type { SettingsKey, SettingsSchema } from "../database/settings/SettingsSchema";

export class SettingsService {
  constructor(private repo: ISettingsRepository) {}

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

  setAsync<K extends SettingsKey>(key: K, value: SettingsSchema[K]): Promise<void> {
    return this.repo.setAsync(key, value);
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
