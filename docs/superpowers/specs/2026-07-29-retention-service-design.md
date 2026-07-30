# Retention Service Design

## Overview

A RetentionService that keeps TimescaleDB retention policies in sync with database settings, driven by EventBus events from SettingsService.

## Events

Three category events published by SettingsService for all setting changes:

| Event | Trigger | Payload |
|-------|---------|---------|
| `sensor.retention.updated` | Any `sensors.*` setting changes | `{ key: string; value: string }` |
| `output.retention.updated` | Any `outputs.*` setting changes | `{ key: string; value: string }` |
| `backup.retention.updated` | Any `system.*` setting changes | `{ key: string; value: string }` |

Payload contains the specific setting key and its new value. Subscribers filter based on their interests.

## SettingsService Changes

- Constructor accepts `IEventBus` as a second parameter
- After `this.#repo.setAsync(key, value)` succeeds, publishes the category event determined by key prefix:
  - `sensors.*` → `sensor.retention.updated`
  - `outputs.*` → `output.retention.updated`
  - `system.*` → `backup.retention.updated`
- A private `#settingEventMap` routes each known setting key to its event type

## RetentionService

### Registry

Private static mapping from setting key to database target:

```
"sensors.raw_retention"        → { table: "sensor_data",         type: "hypertable" }
"outputs.raw_retention"        → { table: "output_data",         type: "hypertable" }
"sensors.5m_agg_retention"     → { table: "sensor_data_5m",      type: "continuous_aggregate" }
"sensors.1h_agg_retention"     → { table: "sensor_data_1h",      type: "continuous_aggregate" }
"sensors.1d_agg_retention"     → { table: "sensor_data_1d",      type: "continuous_aggregate" }
"outputs.5m_agg_retention"     → { table: "output_data_5m",      type: "continuous_aggregate" }
"outputs.1h_agg_retention"     → { table: "output_data_1h",      type: "continuous_aggregate" }
"outputs.1d_agg_retention"     → { table: "output_data_1d",      type: "continuous_aggregate" }
```

Adding a new aggregate table requires one new registry entry. That's it.

### Constructor

- Accepts `IEventBus` and `Knex` connection
- Subscribes to `sensor.retention.updated` and `output.retention.updated`
- Each event handler calls `reconcileAsync()` for the affected setting key

### `reconcileAsync(key)`

1. Look up the setting key in the registry
2. Read the current setting value from the database
3. Parse the duration string (e.g., `"30 days"` → `INTERVAL '30 days'`)
4. Drop any existing retention policy on the target (idempotent — safe to call even if none exists)
5. If value is empty/null/zero → done (no policy = infinite retention)
6. Otherwise → call `add_retention_policy(targetTable, drop_after => INTERVAL ...)`

### `reconcileAllAsync()`

Iterates all 8 tracked settings and reconciles each. Called on startup.

### TimescaleDB Functions

- `add_retention_policy(hypertable, drop_after => INTERVAL '...')` — sets automatic deletion
- `remove_retention_policy(hypertable)` — removes the policy (infinite retention)

## Integration (program.ts)

1. Pass `eventBus` to `SettingsService` constructor
2. Create `RetentionService` with `eventBus` and `knexConnection`
3. Register in DI container as `DI_KEYS.RetentionService`
4. Call `retentionService.reconcileAllAsync()` after `settingsService.syncDefaultsAsync()`

## File Locations

| File | Action |
|------|--------|
| `server/src/eventbus/events/retention/SensorRetentionUpdatedEvent.ts` | New |
| `server/src/eventbus/events/retention/OutputRetentionUpdatedEvent.ts` | New |
| `server/src/eventbus/events/retention/BackupRetentionUpdatedEvent.ts` | New |
| `server/src/eventbus/events/EventMap.ts` | Add 3 event entries |
| `server/src/eventbus/events/Events.ts` | Add 3 event constants |
| `server/src/settings/SettingsService.ts` | Add EventBus + event publishing |
| `server/src/retention/RetentionService.ts` | New |
| `server/src/utils/DependencyInjectionConstants.ts` | Add `RetentionService` key |
| `server/src/program.ts` | Wire services + call `reconcileAllAsync()` |
