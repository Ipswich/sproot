import type { SettingsKey, SettingsSchema } from "../../../database/settings/SettingsSchema";

export type SettingUpdatedPayload<K extends SettingsKey> = {
  key: K;
  value: SettingsSchema[K];
};