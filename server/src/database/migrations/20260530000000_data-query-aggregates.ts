/**
 * Migration: Create TimescaleDB continuous aggregate tables for sensor and output data.
 *
 * Purpose:
 *   Creates 6 continuous aggregate materialized views (sensor_data_5m, sensor_data_1h,
 *   sensor_data_1d, output_data_5m, output_data_1h, output_data_1d) that pre-compute statistics from
 *   raw sensor_data and output_data hypertables. These views use TimescaleDB's
 *   continuous aggregate feature to incrementally refresh on a schedule.
 *
 * Extension requirement:
 *   This migration creates the `timescaledb_toolkit` extension (via CREATE EXTENSION
 *   IF NOT EXISTS). The runtime database image must include the toolkit package so
 *   this extension can be created successfully. The current compose configuration
 *   uses `timescale/timescaledb-ha:pg18-ts2.26`, which bundles the toolkit used by
 *   these aggregates. The toolkit provides
 *   `percentile_agg()`, a hyperloglog-based approximation function used to compute
 *   P1, P5, P10, P25, P50, P75, P90, P95, P99 percentiles in constant space.
 *
 * Safe recreation (idempotent):
 *   Each aggregate view is dropped before recreation via DROP MATERIALIZED VIEW IF
 *   EXISTS, so re-running this migration is safe. If you need to manually drop and
 *   recreate an aggregate outside of migrations, use the DROP AGGREGATE pattern:
 *
 *     -- Drop a specific aggregate (keeps the materialized view, removes the policy)
 *     SELECT remove_continuous_aggregate_policy('sensor_data_1h');
 *     DROP MATERIALIZED VIEW IF EXISTS "sensor_data_1h";
 *
 *     -- Or drop the aggregate policy only (keeps the view)
 *     SELECT remove_continuous_aggregate_policy('sensor_data_1h');
 *
 *     -- Recreate by re-running this migration or the relevant CREATE statements
 *
 *   Note: DROP AGGREGATE IF EXISTS is not a standalone SQL command in TimescaleDB.
 *   The correct pattern is to remove the policy first, then drop the materialized
 *   view, then recreate both via this migration.
 *
 * Rollback:
 *   Run the `down` function of this migration to drop all aggregates and views.
 *   Be aware:
 *     1. Dropping aggregates will cause queries against these views to fail
 *        (the views will no longer exist).
 *     2. Any application code that depends on these aggregate views will need to
 *        fall back to raw GROUP BY queries on the underlying hypertables, which
 *        will be significantly slower.
 *     3. The timescaledb_toolkit extension is NOT dropped in `down` — it may be
 *        used by other migrations or manually installed. Drop it separately if needed:
 *
 *         DROP EXTENSION IF EXISTS timescaledb_toolkit;
 *
 *     4. Raw sensor_data and output_data hypertables are NOT affected by this
 *        migration's rollback — only the aggregate views are removed.
 */

import type { Knex } from "knex";

const SENSOR_1H_VIEW = "sensor_data_1h";
const SENSOR_1D_VIEW = "sensor_data_1d";
const OUTPUT_1H_VIEW = "output_data_1h";
const OUTPUT_1D_VIEW = "output_data_1d";

export const config = {
  transaction: false,
};

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit;");

  // ------------------------------------------------------------------
  // sensor_data_1h
  // ------------------------------------------------------------------
  // DROP MATERIALIZED VIEW IF EXISTS makes this safe to re-run.
  // To manually recreate: drop the policy, drop the view, then re-run this migration.
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "${SENSOR_1H_VIEW}";`);
  await knex.raw(`
    CREATE MATERIALIZED VIEW "${SENSOR_1H_VIEW}"
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket(INTERVAL '1 hour', "logTime") AS bucket,
      sensor_id,
      metric,
      first(units, "logTime" ORDER BY "logTime" ASC) AS units,
      COUNT(*) AS sample_count,
      AVG(data)::numeric(12, 7) AS average_data,
      MIN(data) AS minimum_data,
      MAX(data) AS maximum_data,
      STDDEV_SAMP(data) AS stddev_data,
      MAX("logTime") AS last_log_time,
      percentile_agg(data) AS percentile_sketch,
      first(data, "logTime" ORDER BY "logTime" ASC) AS first_data,
      last(data, "logTime" ORDER BY "logTime" DESC) AS last_data
    FROM "sensor_data"
    GROUP BY bucket, sensor_id, metric
    WITH NO DATA;
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS "idx_sensor_data_1h_lookup"
    ON "${SENSOR_1H_VIEW}" ("sensor_id", "metric", bucket DESC);
  `);
  await knex.raw(`
    DO $$
    BEGIN
      PERFORM add_continuous_aggregate_policy('sensor_data_1h',
        start_offset => INTERVAL '3 hours',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
      );
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Continuous aggregate policy for sensor_data_1h already exists';
    END $$;
  `);

  // ------------------------------------------------------------------
  // sensor_data_1d
  // ------------------------------------------------------------------
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "${SENSOR_1D_VIEW}";`);
  await knex.raw(`
    CREATE MATERIALIZED VIEW "${SENSOR_1D_VIEW}"
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket(INTERVAL '1 day', "logTime") AS bucket,
      sensor_id,
      metric,
      first(units, "logTime" ORDER BY "logTime" ASC) AS units,
      COUNT(*) AS sample_count,
      AVG(data)::numeric(12, 7) AS average_data,
      MIN(data) AS minimum_data,
      MAX(data) AS maximum_data,
      STDDEV_SAMP(data) AS stddev_data,
      MAX("logTime") AS last_log_time,
      percentile_agg(data) AS percentile_sketch,
      first(data, "logTime" ORDER BY "logTime" ASC) AS first_data,
      last(data, "logTime" ORDER BY "logTime" DESC) AS last_data
    FROM "sensor_data"
    GROUP BY bucket, sensor_id, metric
    WITH NO DATA;
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS "idx_sensor_data_1d_lookup"
    ON "${SENSOR_1D_VIEW}" ("sensor_id", "metric", bucket DESC);
  `);
  await knex.raw(`
    DO $$
    BEGIN
      PERFORM add_continuous_aggregate_policy('sensor_data_1d',
        start_offset => INTERVAL '3 days',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
      );
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Continuous aggregate policy for sensor_data_1d already exists';
    END $$;
  `);

  // ------------------------------------------------------------------
  // output_data_1h
  // ------------------------------------------------------------------
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "${OUTPUT_1H_VIEW}";`);
  await knex.raw(`
    CREATE MATERIALIZED VIEW "${OUTPUT_1H_VIEW}"
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket(INTERVAL '1 hour', "logTime") AS bucket,
      output_id,
      COUNT(*) AS sample_count,
      AVG(value)::numeric(12, 7) AS average_value,
      MIN(value) AS minimum_value,
      MAX(value) AS maximum_value,
      STDDEV_SAMP(value) AS stddev_value,
      MAX("logTime") AS last_log_time,
      percentile_agg(value) AS percentile_sketch,
      first(value, "logTime" ORDER BY "logTime" ASC) AS first_value,
      last(value, "logTime" ORDER BY "logTime" DESC) AS last_value
    FROM "output_data"
    GROUP BY bucket, output_id
    WITH NO DATA;
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS "idx_output_data_1h_lookup"
    ON "${OUTPUT_1H_VIEW}" ("output_id", bucket DESC);
  `);
  await knex.raw(`
    DO $$
    BEGIN
      PERFORM add_continuous_aggregate_policy('output_data_1h',
        start_offset => INTERVAL '3 hours',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
      );
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Continuous aggregate policy for output_data_1h already exists';
    END $$;
  `);

  // ------------------------------------------------------------------
  // output_data_1d
  // ------------------------------------------------------------------
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "${OUTPUT_1D_VIEW}";`);
  await knex.raw(`
    CREATE MATERIALIZED VIEW "${OUTPUT_1D_VIEW}"
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket(INTERVAL '1 day', "logTime") AS bucket,
      output_id,
      COUNT(*) AS sample_count,
      AVG(value)::numeric(12, 7) AS average_value,
      MIN(value) AS minimum_value,
      MAX(value) AS maximum_value,
      STDDEV_SAMP(value) AS stddev_value,
      MAX("logTime") AS last_log_time,
      percentile_agg(value) AS percentile_sketch,
      first(value, "logTime" ORDER BY "logTime" ASC) AS first_value,
      last(value, "logTime" ORDER BY "logTime" DESC) AS last_value
    FROM "output_data"
    GROUP BY bucket, output_id
    WITH NO DATA;
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS "idx_output_data_1d_lookup"
    ON "${OUTPUT_1D_VIEW}" ("output_id", bucket DESC);
  `);
  await knex.raw(`
    DO $$
    BEGIN
      PERFORM add_continuous_aggregate_policy('output_data_1d',
        start_offset => INTERVAL '3 days',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
      );
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Continuous aggregate policy for output_data_1d already exists';
    END $$;
  `);

  // ------------------------------------------------------------------
  // Recreate sensor_data_5m with percentile_agg
  // ------------------------------------------------------------------
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "sensor_data_5m";`);
  await knex.raw(`
    CREATE MATERIALIZED VIEW "sensor_data_5m"
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket(INTERVAL '5 minutes', "logTime") AS bucket,
      sensor_id,
      metric,
      first(units, "logTime" ORDER BY "logTime" ASC) AS units,
      COUNT(*) AS sample_count,
      AVG(data)::numeric(12, 7) AS average_data,
      MIN(data) AS minimum_data,
      MAX(data) AS maximum_data,
      STDDEV_SAMP(data) AS stddev_data,
      MAX("logTime") AS last_log_time,
      first(data, "logTime" ORDER BY "logTime" ASC) AS first_data,
      last(data, "logTime" ORDER BY "logTime" DESC) AS last_data,
      percentile_agg(data) AS percentile_sketch
    FROM "sensor_data"
    GROUP BY bucket, sensor_id, metric
    WITH NO DATA;
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS "idx_sensor_data_5m_lookup"
    ON "sensor_data_5m" ("sensor_id", "metric", bucket DESC);
  `);

  // ------------------------------------------------------------------
  // Recreate output_data_5m with percentile_agg
  // ------------------------------------------------------------------
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "output_data_5m";`);
  await knex.raw(`
    CREATE MATERIALIZED VIEW "output_data_5m"
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket(INTERVAL '5 minutes', "logTime") AS bucket,
      output_id,
      COUNT(*) AS sample_count,
      AVG(value)::numeric(12, 7) AS average_value,
      MIN(value) AS minimum_value,
      MAX(value) AS maximum_value,
      STDDEV_SAMP(value) AS stddev_value,
      MAX("logTime") AS last_log_time,
      first(value, "logTime" ORDER BY "logTime" ASC) AS first_value,
      last(value, "logTime" ORDER BY "logTime" DESC) AS last_value,
      percentile_agg(value) AS percentile_sketch
    FROM "output_data"
    GROUP BY bucket, output_id
    WITH NO DATA;
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS "idx_output_data_5m_lookup"
    ON "output_data_5m" ("output_id", bucket DESC);
  `);

  // ------------------------------------------------------------------
  // Add continuous aggregate policies for 5m views
  // ------------------------------------------------------------------
  await knex.raw(`
    DO $$
    BEGIN
      PERFORM add_continuous_aggregate_policy('sensor_data_5m',
        start_offset => INTERVAL '15 minutes',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
      );
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Continuous aggregate policy for sensor_data_5m already exists';
    END $$;
  `);
  await knex.raw(`
    DO $$
    BEGIN
      PERFORM add_continuous_aggregate_policy('output_data_5m',
        start_offset => INTERVAL '15 minutes',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
      );
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Continuous aggregate policy for output_data_5m already exists';
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`SELECT remove_continuous_aggregate_policy('sensor_data_5m');`);
  await knex.raw(`SELECT remove_continuous_aggregate_policy('output_data_5m');`);
  await knex.raw(`SELECT remove_continuous_aggregate_policy('${SENSOR_1H_VIEW}');`);
  await knex.raw(`SELECT remove_continuous_aggregate_policy('${SENSOR_1D_VIEW}');`);
  await knex.raw(`SELECT remove_continuous_aggregate_policy('${OUTPUT_1H_VIEW}');`);
  await knex.raw(`SELECT remove_continuous_aggregate_policy('${OUTPUT_1D_VIEW}');`);
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "sensor_data_5m";`);
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "output_data_5m";`);
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "${SENSOR_1H_VIEW}";`);
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "${SENSOR_1D_VIEW}";`);
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "${OUTPUT_1H_VIEW}";`);
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS "${OUTPUT_1D_VIEW}";`);
}
