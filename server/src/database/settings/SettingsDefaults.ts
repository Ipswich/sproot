/**
 * Default values for all settings keys.
 * Each entry is a complete DB row conforming to the settings table schema,
 * used only for insertion during sync.
 */
export interface SettingDefault {
  key: string;
  value: string;
}

export const DEFAULTS: SettingDefault[] = [
  {
    key: "sensors.raw_retention",
    value: "30 days",
  },
  {
    key: "outputs.raw_retention",
    value: "60 days",
  },
  {
    key: "sensors.5m_agg_retention",
    value: "7 days",
  },
  {
    key: "outputs.5m_agg_retention",
    value: "14 days",
  },
  {
    key: "sensors.1h_agg_retention",
    value: "30 days",
  },
  {
    key: "sensors.1d_agg_retention",
    value: "90 days",
  },
  {
    key: "outputs.1h_agg_retention",
    value: "30 days",
  },
  {
    key: "outputs.1d_agg_retention",
    value: "90 days",
  },
  {
    key: "system.backup_retention",
    value: "30 days",
  },
];
