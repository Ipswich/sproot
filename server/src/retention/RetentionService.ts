import { Knex } from "knex";
import winston from "winston";
import { IEventBus } from "../eventbus/IEventBus";
import { Events } from "../eventbus/events/Events";
import { ISettingsRepository } from "../database/settings/ISettingsRepository";
import type { SettingsKey } from "../database/settings/SettingsSchema";

interface RetentionTarget {
  table: string;
  type: "hypertable" | "continuous_aggregate";
}

const RETENTION_REGISTRY: Readonly<Record<string, RetentionTarget>> = {
  "sensors.raw_retention": { table: "sensor_data", type: "hypertable" },
  "outputs.raw_retention": { table: "output_data", type: "hypertable" },
  "sensors.5m_agg_retention": { table: "sensor_data_5m", type: "continuous_aggregate" },
  "sensors.1h_agg_retention": { table: "sensor_data_1h", type: "continuous_aggregate" },
  "sensors.1d_agg_retention": { table: "sensor_data_1d", type: "continuous_aggregate" },
  "outputs.5m_agg_retention": { table: "output_data_5m", type: "continuous_aggregate" },
  "outputs.1h_agg_retention": { table: "output_data_1h", type: "continuous_aggregate" },
  "outputs.1d_agg_retention": { table: "output_data_1d", type: "continuous_aggregate" },
} as const;

const VALID_DURATION_UNITS = new Set([
  "second",
  "seconds",
  "min",
  "mins",
  "minute",
  "minutes",
  "hour",
  "hours",
  "day",
  "days",
  "week",
  "weeks",
  "month",
  "months",
  "year",
  "years",
]);

const DURATION_REGEX = /^(\d+)\s+([a-zA-Z]+)$/;

export class RetentionService {
  readonly #logger: winston.Logger;
  readonly #knex: Knex;
  readonly #repo: ISettingsRepository;
  readonly #unsubscribeSensor: () => void;
  readonly #unsubscribeOutput: () => void;

  constructor(eventBus: IEventBus, knex: Knex, logger: winston.Logger, repo: ISettingsRepository) {
    this.#knex = knex;
    this.#logger = logger;
    this.#repo = repo;

    this.#unsubscribeSensor = eventBus.subscribe(Events.SENSOR_RETENTION_UPDATED, (event) => {
      void this.reconcileAsync(event.payload.key);
    });

    this.#unsubscribeOutput = eventBus.subscribe(Events.OUTPUT_RETENTION_UPDATED, (event) => {
      void this.reconcileAsync(event.payload.key);
    });
  }

  async reconcileAsync(settingKey: string): Promise<void> {
    const target = RETENTION_REGISTRY[settingKey];
    if (!target) {
      this.#logger.debug(`No retention target registered for setting: ${settingKey}`);
      return;
    }

    const value = await this.#repo.getAsync(settingKey as SettingsKey);
    const stringValue = typeof value === "string" ? value : "";

    if (!stringValue.trim()) {
      await this.#removeRetentionPolicy(target.table);
      return;
    }

    const duration = this.#parseDuration(stringValue);
    if (duration === null) {
      this.#logger.warn(
        `Invalid retention duration for ${settingKey}: "${stringValue}". Skipping.`,
      );
      return;
    }

    await this.#applyRetentionPolicy(target.table, duration);
  }

  async reconcileAllAsync(): Promise<void> {
    const keys = Object.keys(RETENTION_REGISTRY) as string[];
    for (const key of keys) {
      try {
        await this.reconcileAsync(key);
      } catch (err) {
        this.#logger.error(`Failed to reconcile retention for ${key}: ${err}`);
      }
    }
  }

  [Symbol.dispose](): void {
    this.#unsubscribeSensor();
    this.#unsubscribeOutput();
  }

  #parseDuration(value: string): string | null {
    const trimmed = String(value).trim();
    if (trimmed.length === 0) return null;

    const match = trimmed.match(DURATION_REGEX);
    if (!match) return null;

    const amount = parseInt(match[1]!, 10);
    const unit = match[2]!;
    if (amount <= 0 || !VALID_DURATION_UNITS.has(unit)) return null;

    return `${amount} ${unit}`;
  }

  async #removeRetentionPolicy(tableName: string): Promise<void> {
    await this.#knex.raw(`SELECT remove_retention_policy('${tableName}')`).catch(() => {
      // Policy may not exist; ignore
    });
  }

  async #applyRetentionPolicy(tableName: string, duration: string): Promise<void> {
    await this.#knex.raw(`SELECT remove_retention_policy('${tableName}')`).catch(() => {
      // Policy may not exist; ignore
    });

    await this.#knex.raw(
      `SELECT add_retention_policy('${tableName}', drop_after => INTERVAL '${duration}')`,
    );
  }
}
