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
    key: "sensors.data_retention",
    value: "30 days",
  },
  {
    key: "outputs.data_retention",
    value: "60 days",
  },
  {
    key: "system.backup_retention",
    value: "30 days",
  },
];
