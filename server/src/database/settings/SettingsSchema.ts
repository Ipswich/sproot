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
  },
  outputs: {
    raw_retention: "outputs.raw_retention",
    "5m_agg_retention": "outputs.5m_agg_retention",
  },
} as const;
