import type { Knex } from "knex";

const SENSOR_HISTORY_TABLE = "sensor_data";
const OUTPUT_HISTORY_TABLE = "output_data";
const SENSOR_AGGREGATE_VIEW = "sensor_data_5m";
const OUTPUT_AGGREGATE_VIEW = "output_data_5m";

export const config = {
  transaction: false,
};

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE EXTENSION IF NOT EXISTS timescaledb;");

  await knex.raw(`
    ALTER TABLE \"${SENSOR_HISTORY_TABLE}\"
    ALTER COLUMN \"logTime\" TYPE TIMESTAMPTZ
    USING \"logTime\" AT TIME ZONE 'UTC';
  `);
  await knex.raw(`
    ALTER TABLE \"${OUTPUT_HISTORY_TABLE}\"
    ALTER COLUMN \"logTime\" TYPE TIMESTAMPTZ
    USING \"logTime\" AT TIME ZONE 'UTC';
  `);
  await knex.raw(`
    ALTER TABLE \"outputs\"
    ALTER COLUMN \"lastStateUpdate\" TYPE TIMESTAMPTZ
    USING \"lastStateUpdate\" AT TIME ZONE 'UTC';
  `);

  await knex.raw(
    `ALTER TABLE \"${SENSOR_HISTORY_TABLE}\" ALTER COLUMN \"logTime\" SET DEFAULT NOW();`,
  );
  await knex.raw(
    `ALTER TABLE \"${OUTPUT_HISTORY_TABLE}\" ALTER COLUMN \"logTime\" SET DEFAULT NOW();`,
  );
  await knex.raw(`ALTER TABLE \"outputs\" ALTER COLUMN \"lastStateUpdate\" SET DEFAULT NOW();`);

  await knex.raw(`DROP INDEX IF EXISTS \"idx_sensor_logtime\";`);
  await knex.raw(`DROP INDEX IF EXISTS \"idx_output_logtime\";`);
  await knex.raw(`DROP INDEX IF EXISTS \"sensor_data_sensor_id_index\";`);
  await knex.raw(`DROP INDEX IF EXISTS \"output_data_output_id_index\";`);
  await knex.raw(
    `ALTER TABLE \"${SENSOR_HISTORY_TABLE}\" DROP CONSTRAINT IF EXISTS \"sensor_data_pkey\";`,
  );
  await knex.raw(
    `ALTER TABLE \"${OUTPUT_HISTORY_TABLE}\" DROP CONSTRAINT IF EXISTS \"output_data_pkey\";`,
  );

  await knex.raw(`
    SELECT create_hypertable('${SENSOR_HISTORY_TABLE}', 'logTime', if_not_exists => TRUE, migrate_data => TRUE);
  `);
  await knex.raw(`
    SELECT create_hypertable('${OUTPUT_HISTORY_TABLE}', 'logTime', if_not_exists => TRUE, migrate_data => TRUE);
  `);
  await knex.raw(`SELECT set_chunk_time_interval('${SENSOR_HISTORY_TABLE}', INTERVAL '1 day');`);
  await knex.raw(`SELECT set_chunk_time_interval('${OUTPUT_HISTORY_TABLE}', INTERVAL '1 day');`);

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS \"idx_sensor_data_id\" ON \"${SENSOR_HISTORY_TABLE}\" (\"id\");`,
  );
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS \"idx_sensor_data_sensor_metric_logtime_desc\"
    ON \"${SENSOR_HISTORY_TABLE}\" (\"sensor_id\", \"metric\", \"logTime\" DESC);
  `);
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS \"idx_output_data_id\" ON \"${OUTPUT_HISTORY_TABLE}\" (\"id\");`,
  );
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS \"idx_output_data_output_logtime_desc\"
    ON \"${OUTPUT_HISTORY_TABLE}\" (\"output_id\", \"logTime\" DESC);
  `);

  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS \"${SENSOR_AGGREGATE_VIEW}\";`);
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS \"${OUTPUT_AGGREGATE_VIEW}\";`);

  await knex.raw(`
    CREATE MATERIALIZED VIEW \"${SENSOR_AGGREGATE_VIEW}\"
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket(INTERVAL '5 minutes', \"logTime\") AS bucket,
      sensor_id,
      metric,
      units,
      COUNT(*) AS sample_count,
      AVG(data)::numeric(12, 7) AS average_data,
      MIN(data) AS minimum_data,
      MAX(data) AS maximum_data,
      MAX(\"logTime\") AS last_log_time
    FROM \"${SENSOR_HISTORY_TABLE}\"
    GROUP BY bucket, sensor_id, metric, units
    WITH NO DATA;
  `);
  await knex.raw(`
    CREATE MATERIALIZED VIEW \"${OUTPUT_AGGREGATE_VIEW}\"
    WITH (timescaledb.continuous) AS
    SELECT
      time_bucket(INTERVAL '5 minutes', \"logTime\") AS bucket,
      output_id,
      COUNT(*) AS sample_count,
      MIN(value) AS minimum_value,
      MAX(value) AS maximum_value,
      MAX(\"logTime\") AS last_log_time
    FROM \"${OUTPUT_HISTORY_TABLE}\"
    GROUP BY bucket, output_id
    WITH NO DATA;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS \"idx_sensor_data_5m_lookup\"
    ON \"${SENSOR_AGGREGATE_VIEW}\" (\"sensor_id\", \"metric\", bucket DESC);
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS \"idx_output_data_5m_lookup\"
    ON \"${OUTPUT_AGGREGATE_VIEW}\" (\"output_id\", bucket DESC);
  `);

  await knex.raw(`
    SELECT add_continuous_aggregate_policy(
      '${SENSOR_AGGREGATE_VIEW}',
      start_offset => INTERVAL '8 days',
      end_offset => INTERVAL '5 minutes',
      schedule_interval => INTERVAL '1 minute'
    );
  `);
  await knex.raw(`
    SELECT add_continuous_aggregate_policy(
      '${OUTPUT_AGGREGATE_VIEW}',
      start_offset => INTERVAL '8 days',
      end_offset => INTERVAL '5 minutes',
      schedule_interval => INTERVAL '1 minute'
    );
  `);

  await knex.raw(`CALL refresh_continuous_aggregate('${SENSOR_AGGREGATE_VIEW}', NULL, NULL);`);
  await knex.raw(`CALL refresh_continuous_aggregate('${OUTPUT_AGGREGATE_VIEW}', NULL, NULL);`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS \"${SENSOR_AGGREGATE_VIEW}\";`);
  await knex.raw(`DROP MATERIALIZED VIEW IF EXISTS \"${OUTPUT_AGGREGATE_VIEW}\";`);
}
