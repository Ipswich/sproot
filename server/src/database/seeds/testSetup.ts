import { Models } from "@sproot/common/outputs/Models";
import { Knex } from "knex";
import { toDbDate } from "../../utils/dateUtils";
import { SprootDB } from "../SprootDB";

export async function seed(knex: Knex): Promise<void> {
  console.log("Truncating tables...");

  const tables = await getSeedTableNamesAsync(knex);
  await truncateSeedTablesAsync(knex, tables);

  console.log("Seeding test database...");

  await knex("users").insert([
    {
      username: "testuser",
      hash: "$2b$10$6Ld7cz9MRYEuYVJB1J/gcOWm2MXnSqxGZ/XIZJSAEWWQlqF1xci0.",
      email: "test@example.com",
    },
  ]);

  await knex("device_zones").insert([
    { id: 1, name: "Zone 1" },
    { id: 2, name: "Zone 2" },
  ]);

  await knex("outputs").insert([
    {
      id: 1,
      model: Models.PCA9685,
      address: "0x40",
      name: "Relay #1",
      color: "#82c91e",
      pin: "0",
      deviceZoneId: 1,
      isPwm: false,
      isInvertedPwm: false,
      automationTimeout: 1,
    },
    {
      id: 5,
      model: Models.PCA9685,
      address: "0x40",
      name: "Pwm #1",
      color: "#228be6",
      pin: "4",
      deviceZoneId: 2,
      isPwm: true,
      isInvertedPwm: false,
      automationTimeout: 1,
    },
  ]);

  await knex("sensors").insert([
    {
      id: 1,
      name: "BME280",
      model: "BME280",
      address: "0x76",
      color: "#82c91e",
      deviceZoneId: 1,
      lowCalibrationPoint: null,
      highCalibrationPoint: null,
    },
    {
      id: 2,
      name: "DS18B20",
      model: "DS18B20",
      address: "28-583bd446df61",
      color: "#40c057",
      deviceZoneId: 2,
      lowCalibrationPoint: null,
      highCalibrationPoint: null,
    },
    {
      id: 3,
      name: "Capacitive Moisture Sensor",
      model: "CAPACITIVE_MOISTURE_SENSOR",
      address: "0x48",
      color: "#228be6",
      pin: "0",
      deviceZoneId: 1,
      lowCalibrationPoint: 0,
      highCalibrationPoint: 100,
    },
    {
      id: 4,
      name: "ADS1115",
      model: "ADS1115",
      address: "0x48",
      color: "#ff8787",
      pin: "1",
      deviceZoneId: 2,
      lowCalibrationPoint: null,
      highCalibrationPoint: null,
    },
  ]);

  await knex("automations").insert([
    { id: 1, name: "Automation #1", operator: "AND" },
    { id: 2, name: "Automation #2", operator: "OR" },
  ]);

  await knex("sensor_conditions").insert([
    {
      id: 1,
      automation_id: 1,
      groupType: "oneOf",
      operator: "greater",
      comparisonValue: 20,
      sensor_id: 1,
      readingType: "temperature",
    },
    {
      id: 2,
      automation_id: 1,
      groupType: "oneOf",
      operator: "greater",
      comparisonValue: 40,
      sensor_id: 1,
      readingType: "temperature",
    },
  ]);

  await knex("output_conditions").insert([
    {
      id: 1,
      automation_id: 1,
      groupType: "oneOf",
      operator: "greater",
      comparisonValue: 20,
      output_id: 1,
    },
    {
      id: 2,
      automation_id: 1,
      groupType: "oneOf",
      operator: "greater",
      comparisonValue: 40,
      output_id: 1,
    },
  ]);

  await knex("time_conditions").insert([
    { id: 1, automation_id: 1, groupType: "oneOf", startTime: "00:00", endTime: "11:59" },
    { id: 2, automation_id: 1, groupType: "oneOf", startTime: "12:00", endTime: "23:59" },
  ]);

  await knex("weekday_conditions").insert([
    { id: 1, automation_id: 1, groupType: "oneOf", weekdays: 5 },
    { id: 2, automation_id: 1, groupType: "oneOf", weekdays: 122 },
  ]);

  await knex("month_conditions").insert([
    { id: 1, automation_id: 1, groupType: "oneOf", months: 5 },
    { id: 2, automation_id: 1, groupType: "oneOf", months: 4095 },
  ]);

  await knex("date_range_conditions").insert([
    {
      id: 1,
      automation_id: 1,
      groupType: "oneOf",
      startDate: 1,
      startMonth: 1,
      endDate: 31,
      endMonth: 12,
    },
    {
      id: 2,
      automation_id: 1,
      groupType: "oneOf",
      startDate: 1,
      startMonth: 3,
      endDate: 31,
      endMonth: 5,
    },
  ]);

  await knex("output_actions").insert([
    { id: 1, automation_id: 1, output_id: 1, value: 100 },
    { id: 2, automation_id: 1, output_id: 1, value: 0 },
    { id: 3, automation_id: 2, output_id: 5, value: 25 },
    { id: 4, automation_id: 2, output_id: 5, value: 50 },
    { id: 5, automation_id: 2, output_id: 5, value: 75 },
  ]);

  await knex("notification_actions").insert([
    { id: 1, automation_id: 1, subject: "Test Notification 1", content: "Test Content 1" },
    { id: 2, automation_id: 1, subject: "Test Notification 2", content: "Test Content 2" },
    { id: 3, automation_id: 2, subject: "Test Notification 3", content: "Test Content 3" },
  ]);

  await knex("camera_settings").insert({
    enabled: false,
    name: "Pi Camera",
    xVideoResolution: null,
    yVideoResolution: null,
    videoFps: null,
    xImageResolution: null,
    yImageResolution: null,
    imageRetentionDays: 90,
    imageRetentionSize: 5000,
    timelapseEnabled: false,
    timelapseInterval: 5,
    timelapseStartTime: null,
    timelapseEndTime: null,
  });

  // Add recent sensor and output readings so journal entry device-data attaches find data
  const nowSql = toDbDate();

  await knex("sensor_data").insert([
    {
      sensor_id: 1,
      metric: "temperature",
      data: 22.5,
      units: "°C",
      logTime: nowSql,
    },
  ]);

  await knex("output_data").insert([
    {
      output_id: 1,
      value: 1,
      controlMode: "manual",
      logTime: nowSql,
    },
  ]);

  // Data-query test rows: sensor and output data in a 3-day window relative to now
  const dataQueryEnd = toDbDate();
  const dayStart = toDbDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
  const dayStartNoon = toDbDate(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
  );
  const dayStartEvening = toDbDate(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000),
  );
  const dayStartLate = toDbDate(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000),
  );
  const dayStartLate2 = toDbDate(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 22 * 60 * 60 * 1000),
  );

  await knex("sensor_data").insert([
    { sensor_id: 1, metric: "temperature", data: 22.5, units: "°C", logTime: dayStart },
    { sensor_id: 1, metric: "humidity", data: 50.0, units: "%", logTime: dayStart },
    { sensor_id: 2, metric: "temperature", data: 21.0, units: "°C", logTime: dayStart },
    { sensor_id: 1, metric: "temperature", data: 23.0, units: "°C", logTime: dataQueryEnd },
    { sensor_id: 1, metric: "temperature", data: 23.5, units: "°C", logTime: dayStartNoon },
    { sensor_id: 1, metric: "temperature", data: 24.0, units: "°C", logTime: dayStartEvening },
    { sensor_id: 1, metric: "temperature", data: 24.5, units: "°C", logTime: dayStartLate },
    { sensor_id: 1, metric: "temperature", data: 25.0, units: "°C", logTime: dayStartLate2 },
  ]);

  await knex("output_data").insert([
    { output_id: 1, value: 100, controlMode: "manual", logTime: dayStart },
    { output_id: 1, value: 75, controlMode: "manual", logTime: dataQueryEnd },
    { output_id: 1, value: 50, controlMode: "manual", logTime: dayStartNoon },
    { output_id: 1, value: 25, controlMode: "manual", logTime: dayStartEvening },
    { output_id: 5, value: 50, controlMode: "manual", logTime: dayStart },
  ]);

  // Data-query test rows: sensor data at 10/8/5 min ago for aggregate path tests
  const tenMinAgo = toDbDate(new Date(Date.now() - 10 * 60 * 1000));
  const eightMinAgo = toDbDate(new Date(Date.now() - 8 * 60 * 1000));
  const fiveMinAgo = toDbDate(new Date(Date.now() - 5 * 60 * 1000));

  await knex("sensor_data").insert([
    { sensor_id: 1, metric: "temperature", data: 23.5, units: "°C", logTime: tenMinAgo },
    { sensor_id: 1, metric: "temperature", data: 23.8, units: "°C", logTime: eightMinAgo },
    { sensor_id: 1, metric: "temperature", data: 24.0, units: "°C", logTime: fiveMinAgo },
    { sensor_id: 1, metric: "humidity", data: 55.0, units: "%", logTime: tenMinAgo },
    { sensor_id: 2, metric: "temperature", data: 21.0, units: "°C", logTime: tenMinAgo },
  ]);

  await knex("output_data").insert([
    { output_id: 1, value: 100, controlMode: "manual", logTime: tenMinAgo },
    { output_id: 1, value: 75, controlMode: "manual", logTime: eightMinAgo },
    { output_id: 5, value: 50, controlMode: "manual", logTime: tenMinAgo },
  ]);

  // Bulk seed data spanning 3 days for aggregate tests
  await generateDataQuerySeedData(knex, new SprootDB(knex));

  // Refresh continuous aggregates so downsample: "1h"/"1d" sees seeded data
  await knex.raw(`CALL refresh_continuous_aggregate('sensor_data_5m', NULL, NULL);`);
  await knex.raw(`CALL refresh_continuous_aggregate('sensor_data_1h', NULL, NULL);`);
  await knex.raw(`CALL refresh_continuous_aggregate('sensor_data_1d', NULL, NULL);`);
  await knex.raw(`CALL refresh_continuous_aggregate('output_data_5m', NULL, NULL);`);
  await knex.raw(`CALL refresh_continuous_aggregate('output_data_1h', NULL, NULL);`);
  await knex.raw(`CALL refresh_continuous_aggregate('output_data_1d', NULL, NULL);`);

  console.log("Seeding complete.");
}

async function getSeedTableNamesAsync(knex: Knex): Promise<string[]> {
  const excludedTableNames = new Set(["knex_migrations", "knex_migrations_lock"]);
  const tables = await knex.select("table_name").from("information_schema.tables").where({
    table_schema: "public",
    table_type: "BASE TABLE",
  });

  return tables
    .map((table) => table.table_name as string)
    .filter((tableName) => !excludedTableNames.has(tableName));
}

async function truncateSeedTablesAsync(knex: Knex, tables: string[]): Promise<void> {
  if (tables.length === 0) {
    return;
  }

  const tableList = tables.map((tableName) => quoteIdentifier(tableName)).join(", ");
  await knex.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export async function generateDataQuerySeedData(
  knex: Knex,
  _db: SprootDB,
): Promise<{
  sensorReadingIds: number[];
  outputReadingIds: number[];
  sensorIds: number[];
  outputIds: number[];
  zoneId: number;
}> {
  const zoneId = 1;

  // Ensure device zones exist
  const existingZones = await knex("device_zones").select("id").whereIn("id", [1, 2]);
  const existingZoneIds = existingZones.map((z) => z.id);
  if (!existingZoneIds.includes(1)) {
    await knex("device_zones").insert({ id: 1, name: "Zone 1" });
  }
  if (!existingZoneIds.includes(2)) {
    await knex("device_zones").insert({ id: 2, name: "Zone 2" });
  }

  // Ensure sensors 1-4 exist for data query tests
  const existingSensors = await knex("sensors").select("id").whereIn("id", [1, 2, 3, 4]);
  const existingSensorIds = existingSensors.map((s) => s.id);
  const missingSensors = [1, 2, 3, 4].filter((id) => !existingSensorIds.includes(id));
  if (missingSensors.length > 0) {
    const sensorDefs: Record<
      number,
      {
        name: string;
        model: string;
        address: string;
        color: string;
        pin?: string;
        lowCalibrationPoint?: number | null;
        highCalibrationPoint?: number | null;
      }
    > = {
      1: { name: "BME280", model: "BME280", address: "0x76", color: "#82c91e" },
      2: { name: "DS18B20", model: "DS18B20", address: "28-583bd446df61", color: "#40c057" },
      3: {
        name: "Capacitive Moisture Sensor",
        model: "CAPACITIVE_MOISTURE_SENSOR",
        address: "0x48",
        color: "#228be6",
        pin: "0",
        lowCalibrationPoint: 0,
        highCalibrationPoint: 100,
      },
      4: { name: "ADS1115", model: "ADS1115", address: "0x48", color: "#ff8787", pin: "1" },
    };
    await knex("sensors").insert(
      missingSensors.map((id) => {
        const def = sensorDefs[id]!;
        return {
          id,
          ...def,
          deviceZoneId: [1, 2, 1, 2][id - 1],
          lowCalibrationPoint: def.lowCalibrationPoint ?? null,
          highCalibrationPoint: def.highCalibrationPoint ?? null,
        };
      }),
    );
  }

  const sensorIds: number[] = [1, 2, 3, 4];
  const sensorReadingTypes: Record<number, string[]> = {
    1: ["temperature", "humidity", "pressure"],
    2: ["temperature"],
    3: ["moisture"],
    4: ["voltage"],
  };
  const readingUnits: Record<string, string> = {
    temperature: "°C",
    humidity: "%rH",
    pressure: "hPa",
    moisture: "%",
    voltage: "V",
  };

  // Ensure outputs 1 and 5 exist for data query tests
  const existingOutputs = await knex("outputs").select("id").whereIn("id", [1, 5]);
  const existingIds = existingOutputs.map((o) => o.id);
  const missingOutputs = [1, 5].filter((id) => !existingIds.includes(id));
  if (missingOutputs.length > 0) {
    await knex("outputs").insert(
      missingOutputs.map((id) => ({
        id,
        model: Models.PCA9685,
        address: "0x40",
        name: id === 1 ? "Relay #1" : "Pwm #1",
        color: id === 1 ? "#82c91e" : "#228be6",
        pin: id === 1 ? "0" : "4",
        deviceZoneId: id === 1 ? 1 : 2,
        isPwm: id === 5,
        isInvertedPwm: false,
        automationTimeout: 1,
      })),
    );
  }

  const outputIds: number[] = [1, 5];

  const sensorReadingIds: number[] = [];
  const outputReadingIds: number[] = [];

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 20, 40];
  const days = [1, 2, 3];
  const baseDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const sensorBatch: Array<{
    sensor_id: number;
    metric: string;
    data: number;
    units: string;
    logTime: string;
  }> = [];
  const outputBatch: Array<{
    output_id: number;
    value: number;
    controlMode: string;
    logTime: string;
  }> = [];

  for (const day of days) {
    for (const hour of hours) {
      for (const minute of minutes) {
        const minuteOffset = minutes.indexOf(minute);
        const isoDate = new Date(
          baseDate.getTime() + day * 86400000 + hour * 3600000 + minute * 60000,
        ).toISOString();

        for (const sensorId of sensorIds) {
          const types = sensorReadingTypes[sensorId]!;
          for (const readingType of types) {
            const value = 20.0 + hour * 0.5 + minuteOffset;
            sensorBatch.push({
              sensor_id: sensorId,
              metric: readingType,
              data: value,
              units: readingUnits[readingType] ?? "",
              logTime: isoDate,
            });
            sensorReadingIds.push(sensorId);
          }
        }

        for (let i = 0; i < outputIds.length; i++) {
          const outputId = outputIds[i]!;
          const value = (minuteOffset + i) % 2;
          outputBatch.push({
            output_id: outputId,
            value,
            controlMode: "manual",
            logTime: isoDate,
          });
          outputReadingIds.push(outputId);
        }
      }
    }
  }

  if (sensorBatch.length > 0) {
    await knex("sensor_data").insert(sensorBatch);
  }
  if (outputBatch.length > 0) {
    await knex("output_data").insert(outputBatch);
  }

  return { sensorReadingIds, outputReadingIds, sensorIds, outputIds, zoneId };
}
