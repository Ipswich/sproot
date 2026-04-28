---
sidebar_position: 20
title: MySQL to PostgreSQL Cutover
---

# MySQL to PostgreSQL Cutover

Sproot's bridge release supports a staged migration from MySQL or MariaDB to PostgreSQL. In the default Docker deployment, the server now performs that bridge automatically during normal startup when both databases are configured.

## Default Startup Flow

With the default compose configuration, the normal operator path is:

```bash
docker compose up -d
```

The server starts with MySQL as the source configuration, detects the PostgreSQL target configuration, and attempts to:

- create the PostgreSQL database if needed
- import and validate bridge-managed tables
- mark cutover complete in PostgreSQL metadata
- continue startup on PostgreSQL in the same boot

If that automatic bridge attempt fails, the server logs the failure and continues on MySQL so the application still comes up.

## Prerequisites

- Keep the MySQL deployment intact until cutover is complete.
- Ensure the bridge release is deployed before attempting the migration.
- Confirm both databases are reachable from the server container or host.
- Capture a backup of the MySQL database before starting the bridge run.

## Environment

The regular server runtime still uses `DATABASE_*` environment variables.

The bridge commands use prefixed connection settings:

- `SOURCE_DATABASE_CLIENT`, `SOURCE_DATABASE_HOST`, `SOURCE_DATABASE_PORT`, `SOURCE_DATABASE_USER`, `SOURCE_DATABASE_PASSWORD`
- `TARGET_DATABASE_CLIENT`, `TARGET_DATABASE_HOST`, `TARGET_DATABASE_PORT`, `TARGET_DATABASE_USER`, `TARGET_DATABASE_PASSWORD`

Optional preflight backup settings:

- `BRIDGE_BACKUP_SOURCE_BEFORE_IMPORT`
- `BRIDGE_BACKUP_TARGET_BEFORE_IMPORT`
- `BRIDGE_BACKUP_DIRECTORY`

For the current bridge implementation:

- Source must resolve to `mysql2`
- Target must resolve to `pg`

## Preflight Import and Validation

Run the bridge migrator first if you need to rehearse or debug outside the automatic startup path:

```bash
cd server
npm run migrate:bridge:preflight
```

Or with Docker Compose:

```bash
docker compose --profile bridge up -d db postgres
docker compose --profile bridge run --rm migrator
```

The preflight command:

- optionally creates compressed source and target backups before import begins
- truncates bridge-managed tables in PostgreSQL
- imports data from MySQL into PostgreSQL
- reseeds PostgreSQL sequences
- validates row counts and id ranges per imported table
- writes status and summaries into `database_migration_runs` and `database_migration_state`

If backup flags are enabled, backup metadata is recorded with the migration run summary. The Docker Compose bridge profile enables both source and target preflight backups by default.

For a repeatable local dry run from the repo root:

```bash
npm run bridge:rehearsal
```

To include cutover in the same rehearsal:

```bash
npm run bridge:rehearsal -- --with-cutover
```

On success, the active state becomes `validated_pending_cutover` and MySQL remains authoritative.

## Cutover

Only run cutover manually after a validated preflight run:

```bash
cd server
npm run migrate:bridge:cutover
```

Or with Docker Compose:

```bash
docker compose --profile bridge run --rm cutover
```

Cutover succeeds only when:

- the active migration run exists
- the run status is `validated`
- the validation summary is successful
- the authoritative client is still `mysql2`

On success, PostgreSQL is marked authoritative and the state changes to `cutover_complete`.

## Runtime Enforcement

After a manual cutover, restart the server with PostgreSQL as the runtime database if you are not using the seamless startup path:

```bash
DATABASE_CLIENT=pg npm run start
```

The server startup guard blocks PostgreSQL runtime if bridge metadata shows cutover is incomplete.

Future PostgreSQL-only releases can additionally set:

```bash
REJECT_MYSQL_RUNTIME=true
```

That setting prevents the server from starting on MySQL at all.

## Rollback Position

Until cutover completes, MySQL remains the authoritative database and rollback is operationally simple: keep the server pointed at MySQL and rerun the bridge after issues are corrected.

After cutover, rollback requires restoring MySQL or replaying the bridge from a known-good backup. Automated rollback rehearsal and backup orchestration are still separate follow-up work.
