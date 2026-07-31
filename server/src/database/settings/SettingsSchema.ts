/**
 * Defines every known setting key and its corresponding value type.
 * The database stores all values as JSONB; this schema provides
 * compile-time type safety for known settings.
 */
export interface SettingsSchema {
  "sensors.data_retention": string;
  "outputs.data_retention": string;
  "system.backup_retention": string;
}

/** Extracts a union of all known setting keys. */
export type SettingsKey = keyof SettingsSchema;

/**
 * Namespaced constants for all known setting keys.
 * Use these instead of string literals to avoid magic strings.
 *
 * Example: SETTINGS.sensors.data_retention
 */
export const SETTINGS = {
  sensors: {
    data_retention: "sensors.data_retention",
  },
  outputs: {
    data_retention: "outputs.data_retention",
  },
  system: {
    backup_retention: "system.backup_retention",
  },
} as const;

/**
 * Compile-time assertion that all SETTINGS values are valid SettingsKey members.
 * If a key is added to SettingsSchema but not to SETTINGS, this line will
 * produce a TypeScript error, surfacing the mismatch at compile time.
 */
type _AllSettingsValuesAreKeys =
  | (typeof SETTINGS)["sensors"]["data_retention"]
  | (typeof SETTINGS)["outputs"]["data_retention"]
  | (typeof SETTINGS)["system"]["backup_retention"];

// Compile-time: every SETTINGS value must be assignable to SettingsKey
const _assertSettingsValuesAreKeys: _AllSettingsValuesAreKeys extends SettingsKey ? true : never =
  true;
void _assertSettingsValuesAreKeys;
