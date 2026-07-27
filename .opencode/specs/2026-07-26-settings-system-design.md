# Settings System Design

**Date:** 2026-07-26
**Status:** Approved

## Overview

A generic, type-safe application settings system backed by PostgreSQL. Provides a repository layer for CRUD operations on key-value settings with compile-time type safety. Hides all database implementation details. No business logic — persistence only.

## Database

**Table:** `settings`

| Column | Type | Constraints |
|--------|------|-------------|
| `key` | TEXT | PRIMARY KEY |
| `value` | JSONB | NOT NULL |
| `description` | TEXT | NULL |
| `editable` | BOOLEAN | NOT NULL DEFAULT TRUE |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

Keys use namespaced dot notation (e.g., `sensors.raw_retention`). The table is completely generic — no application-specific columns.

## File Structure

```
server/src/database/
├── settings/
│   ├── SettingsSchema.ts          — type definitions + SETTINGS keys
│   ├── ISettingsRepository.ts     — interface contract
│   ├── SettingsRepository.ts      — implementation
│   └── test/SettingsRepository.spec.ts  — tests
├── migrations/
│   └── <timestamp>_settings.ts    — creates settings table
└── SprootDB.ts                    — compose settings repository (modified)
```

All new files live in `server/src/database/settings/`.

## SettingsSchema

Central type defining every known setting and its value type. Lives in the server module.

```ts
interface SettingsSchema {
  "sensors.raw_retention": string;
  "outputs.raw_retention": string;
  "sensors.5m_agg_retention": string;
  "outputs.5m_agg_retention": string;
}
```

Supports primitives, objects, and arrays as values.

## SETTINGS Keys

Central constants to avoid magic strings:

```ts
const SETTINGS = {
  sensors: {
    raw_retention: "sensors.raw_retention",
    "5m_agg_retention": "sensors.5m_agg_retention",
  },
  outputs: {
    raw_retention: "outputs.raw_retention",
    "5m_agg_retention": "outputs.5m_agg_retention",
  },
} as const;
```

Callers use `SETTINGS.sensors.raw_retention` instead of repeating string literals.

## Repository Interface

```ts
interface ISettingsRepository {
  get<K extends keyof SettingsSchema>(key: K): Promise<SettingsSchema[K] | undefined>;
  getMany(keys: Array<keyof SettingsSchema>): Promise<Record<keyof SettingsSchema, SettingsSchema[keyof SettingsSchema] | undefined>>;
  getAll(): Promise<Record<keyof SettingsSchema, SettingsSchema[keyof SettingsSchema] | undefined>>;
  set<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): Promise<void>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
```

Generic methods constrain keys at compile time. `get("sensors.raw_retention")` returns `Promise<string | undefined>`.

## Repository Implementation

Extends `BaseKnexRepository` for Knex connection access. Handles:
- JSON serialization/deserialization
- Type casting between schema-typed values and generic database model
- Internal `toModel()` and `fromModel()` helpers for type bridging

Generic methods (`getAll`, `exists`, `delete`) use `string` keys since they operate on arbitrary keys not necessarily in the schema.

## SprootDB Composition

Add `settings: ISettingsRepository` to SprootDB and ISprootDB, instantiated in the constructor:

```ts
this.settings = new SettingsRepository(connection);
```

## Tests

Mocha + Chai + Sinon with Knex stubs (following existing pattern):
- `get()` — returns value for existing key, undefined for unknown
- `getMany()` — returns map with values for existing keys, undefined for missing
- `getAll()` — returns full settings map
- `set()` — serializes and stores value, overwrites existing
- `exists()` — returns true/false correctly
- `delete()` — removes setting, subsequent get returns undefined
- JSONB serialization/deserialization round-trip

## Future Architecture

A `SettingsService` can wrap this repository with:
- Validation
- Caching
- Default values
- Reaction to setting changes
- Updating external systems

The repository remains focused on persistence only.

## Recommendations

1. Keep schema, keys, interface, and implementation in one directory — they change together.
2. The `editable` column is stored but not exposed by the repository — a future service can use it to gate write operations.
3. Adding a new setting requires updating two places: `SettingsSchema` (type) and `SETTINGS` (key constant). This is intentional — both the type and the constant are needed for full safety.
