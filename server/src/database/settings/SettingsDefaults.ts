/**
 * Default values for all settings keys.
 * Each entry is a complete DB row conforming to the settings table schema,
 * used only for insertion during sync.
 */
export interface SettingDefault {
  key: string;
  value: string;
  description: string;
  editable: boolean;
}

export const DEFAULTS: SettingDefault[] = [
  {
    key: "sensors.raw_retention",
    value: "30 days",
    description: "How long raw sensor readings are kept before deletion",
    editable: true,
  },
  {
    key: "outputs.raw_retention",
    value: "60 days",
    description: "How long raw output readings are kept before deletion",
    editable: true,
  },
  {
    key: "sensors.5m_agg_retention",
    value: "7 days",
    description: "How long 5-minute aggregated sensor data is kept before deletion",
    editable: true,
  },
  {
    key: "outputs.5m_agg_retention",
    value: "14 days",
    description: "How long 5-minute aggregated output data is kept before deletion",
    editable: true,
  },
  {
    key: "sensors.1h_agg_retention",
    value: "30 days",
    description: "How long 1-hour aggregated sensor data is kept before deletion",
    editable: true,
  },
  {
    key: "sensors.1d_agg_retention",
    value: "90 days",
    description: "How long daily aggregated sensor data is kept before deletion",
    editable: true,
  },
  {
    key: "outputs.1h_agg_retention",
    value: "30 days",
    description: "How long 1-hour aggregated output data is kept before deletion",
    editable: true,
  },
  {
    key: "outputs.1d_agg_retention",
    value: "90 days",
    description: "How long daily aggregated output data is kept before deletion",
    editable: true,
  },
  {
    key: "system.backup_retention",
    value: "30 days",
    description: "How long database backups are kept before deletion",
    editable: true,
  },
];
