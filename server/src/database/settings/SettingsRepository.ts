import type { ISettingsRepository } from "./ISettingsRepository";
import type { SettingsKey, SettingsSchema } from "./SettingsSchema";
import { SETTINGS } from "./SettingsSchema";
import { DEFAULTS } from "./SettingsDefaults";
import { BaseKnexRepository } from "../repositories/utils/BaseKnexRepository";
import { Knex } from "knex";

interface SettingsRow {
  key: string;
  value: unknown;
}

export class SettingsRepository extends BaseKnexRepository implements ISettingsRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAsync<K extends SettingsKey>(key: K): Promise<SettingsSchema[K] | undefined> {
    const result = await this.connection<SettingsRow[]>("settings")
      .select("key", "value")
      .where("key", key)
      .first();

    if (!result) {
      return undefined;
    }

    return result.value as SettingsSchema[K];
  }

  async getManyAsync(
    keys: SettingsKey[],
  ): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>> {
    const result = await this.connection<SettingsRow[]>("settings")
      .select("key", "value")
      .whereIn("key", keys);

    const map = this.emptySettingsMap();
    for (const row of result) {
      const key = row.key as SettingsKey;
      if (key in map) {
        map[key] = row.value as SettingsSchema[SettingsKey];
      }
    }

    return map;
  }

  async getAllAsync(): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>> {
    const result = await this.connection<SettingsRow[]>("settings").select("key", "value");

    const map = this.emptySettingsMap();
    for (const row of result) {
      const key = row.key as SettingsKey;
      if (key in map) {
        map[key] = row.value as SettingsSchema[SettingsKey];
      }
    }

    return map;
  }

  async setAsync<K extends SettingsKey>(key: K, value: SettingsSchema[K]): Promise<void> {
    let encodedValue: unknown;
    if (value === null) {
      encodedValue = this.connection.raw("'null'::jsonb");
    } else if (typeof value === "string") {
      encodedValue = JSON.stringify(value);
    } else {
      encodedValue = value;
    }
    await this.connection("settings")
      .insert({ key, value: encodedValue })
      .onConflict("key")
      .merge();
  }

  async existsAsync(key: string): Promise<boolean> {
    const result = await this.connection("settings").where("key", key).count("* as count").first();

    const count = result?.["count"];
    if (typeof count === "number") return count > 0;
    return Number(count ?? 0) > 0;
  }

  async deleteAsync(key: string): Promise<void> {
    await this.connection("settings").where("key", key).del();
  }

  async syncDefaultsAsync(): Promise<void> {
    const existingKeys = new Set<string>();
    for (const def of DEFAULTS) {
      if (await this.existsAsync(def.key)) {
        existingKeys.add(def.key);
      }
    }

    const keysToInsert = DEFAULTS.filter((def) => !existingKeys.has(def.key));

    if (keysToInsert.length === 0) {
      return;
    }

    const rows = keysToInsert.map((def) => ({
      key: def.key,
      value: def.value === null ? this.connection.raw("'null'::jsonb") : JSON.stringify(def.value),
    }));

    await this.connection("settings").insert(rows).onConflict("key").merge();
  }

  private emptySettingsMap(): Record<SettingsKey, SettingsSchema[SettingsKey] | undefined> {
    const map = {} as Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>;
    const keys: SettingsKey[] = [];
    for (const section of Object.values(SETTINGS)) {
      for (const key of Object.values(section) as string[]) {
        keys.push(key as SettingsKey);
      }
    }
    for (const key of keys) {
      map[key] = undefined;
    }
    return map;
  }
}
