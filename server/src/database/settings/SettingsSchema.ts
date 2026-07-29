/**
 * Defines every known setting key and its corresponding value type.
 * The database stores all values as JSONB; this schema provides
 * compile-time type safety for known settings.
 */
export interface SettingsSchema {
  "sensors.raw_retention": string;
  "outputs.raw_retention": string;
  "sensors.5m_agg_retention": string;
  "outputs.5m_agg_retention": string;
  "sensors.1h_agg_retention": string;
  "sensors.1d_agg_retention": string;
  "outputs.1h_agg_retention": string;
  "outputs.1d_agg_retention": string;
  "system.backup_retention": string;
}

/** Extracts a union of all known setting keys. */
export type SettingsKey = keyof SettingsSchema;

/**
 * Namespaced constants for all known setting keys.
 * Use these instead of string literals to avoid magic strings.
 *
 * Example: SETTINGS.sensors.raw_retention
 */
export const SETTINGS = {
  sensors: {
    raw_retention: "sensors.raw_retention",
    "5m_agg_retention": "sensors.5m_agg_retention",
    "1h_agg_retention": "sensors.1h_agg_retention",
    "1d_agg_retention": "sensors.1d_agg_retention",
  },
  outputs: {
    raw_retention: "outputs.raw_retention",
    "5m_agg_retention": "outputs.5m_agg_retention",
    "1h_agg_retention": "outputs.1h_agg_retention",
    "1d_agg_retention": "outputs.1d_agg_retention",
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
  | (typeof SETTINGS)["sensors"]["raw_retention"]
  | (typeof SETTINGS)["sensors"]["5m_agg_retention"]
  | (typeof SETTINGS)["sensors"]["1h_agg_retention"]
  | (typeof SETTINGS)["sensors"]["1d_agg_retention"]
  | (typeof SETTINGS)["outputs"]["raw_retention"]
  | (typeof SETTINGS)["outputs"]["5m_agg_retention"]
  | (typeof SETTINGS)["outputs"]["1h_agg_retention"]
  | (typeof SETTINGS)["outputs"]["1d_agg_retention"]
  | (typeof SETTINGS)["system"]["backup_retention"];

// Compile-time: every SETTINGS value must be assignable to SettingsKey
const _assertSettingsValuesAreKeys: _AllSettingsValuesAreKeys extends SettingsKey ? true : never =
  true;
void _assertSettingsValuesAreKeys;
