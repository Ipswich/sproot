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
  getAsync<K extends SettingsKey>(key: K): Promise<SettingsSchema[K] | undefined>;

  /**
   * Get multiple settings by keys.
   * Returns a map with values for existing keys; undefined for missing keys.
   */
  getManyAsync(
    keys: SettingsKey[],
  ): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>>;

  /**
   * Get all known settings.
   * Returns a map of all keys to their values (undefined for missing).
   */
  getAllAsync(): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>>;

  /**
   * Set or update a setting value.
   * The value must match the type declared in SettingsSchema for the given key.
   */
  setAsync<K extends SettingsKey>(key: K, value: SettingsSchema[K]): Promise<void>;

  /**
   * Check if a key exists in the settings table.
   * Uses string key since this operates on arbitrary keys, not just known ones.
   */
  existsAsync(key: string): Promise<boolean>;

  /**
   * Delete a setting by key.
   * Uses string key since this operates on arbitrary keys, not just known ones.
   */
  deleteAsync(key: string): Promise<void>;

  /**
   * Insert default settings that are missing from the database.
   * Only inserts keys not already present — never overwrites existing values.
   */
  syncDefaultsAsync(): Promise<void>;
}
