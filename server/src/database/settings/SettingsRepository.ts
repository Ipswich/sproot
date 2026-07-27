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
    _keys: SettingsKey[],
  ): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>> {
    throw new Error("Not implemented");
  }

  async getAll(): Promise<Record<SettingsKey, SettingsSchema[SettingsKey] | undefined>> {
    throw new Error("Not implemented");
  }

  async set<K extends SettingsKey>(_key: K, _value: SettingsSchema[K]): Promise<void> {
    throw new Error("Not implemented");
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error("Not implemented");
  }

  async delete(_key: string): Promise<void> {
    throw new Error("Not implemented");
  }

  // @ts-expect-error - Used by getMany/getMany in later tasks
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
