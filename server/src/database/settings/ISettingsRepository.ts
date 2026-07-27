import type { SettingsKey, SettingsSchema } from "./SettingsSchema";

/**
 * Contract for the settings repository.
 * Provides type-safe CRUD operations for application settings.
 */
export interface ISettingsRepository {
  /**
   * Get a single setting by key.
   * Returns undefined if the key does not exist.
   */
  get<K extends SettingsKey>(key: K): Promise<SettingsSchema[K] | undefined>;

  /**
   * Get multiple settings by keys.
   * Returns a map with values for existing keys; undefined for missing keys.
   */
  getMany(
    keys: SettingsKey[],
  ): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>>;

  /**
   * Get all known settings.
   * Returns a map of all keys to their values (undefined for missing).
   */
  getAll(): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>>;

  /**
   * Set or update a setting value.
   * The value must match the type declared in SettingsSchema for the given key.
   */
  set<K extends SettingsKey>(key: K, value: SettingsSchema[K]): Promise<void>;

  /**
   * Check if a key exists in the settings table.
   * Uses string key since this operates on arbitrary keys, not just known ones.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Delete a setting by key.
   * Uses string key since this operates on arbitrary keys, not just known ones.
   */
  delete(key: string): Promise<void>;
}
