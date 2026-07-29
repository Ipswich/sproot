import type { ISettingsRepository } from "./ISettingsRepository";
import type { SettingsKey, SettingsSchema } from "./SettingsSchema";
import { SETTINGS } from "./SettingsSchema";
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

  async get<K extends SettingsKey>(key: K): Promise<SettingsSchema[K] | undefined> {
    const result = await this.connection<SettingsRow[]>("settings")
      .select("key", "value")
      .where("key", key)
      .first();

    if (!result) {
      return undefined;
    }

    return result.value as SettingsSchema[K];
  }

  async getMany(
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

  async getAll(): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>> {
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

  async set<K extends SettingsKey>(key: K, value: SettingsSchema[K]): Promise<void> {
    await this.connection("settings").insert({ key, value }).onConflict("key").merge();
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.connection("settings").where("key", key).count("* as count").first();

    const count = result?.["count"];
    if (typeof count === "number") return count > 0;
    return Number(count ?? 0) > 0;
  }

  async delete(key: string): Promise<void> {
    await this.connection("settings").where("key", key).del();
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
