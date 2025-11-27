import { Models } from "@sproot/sproot-common/dist/outputs/Models";
import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  console.log("Truncating tables...");

  let tables = await knex
    .select("table_name")
    .from("information_schema.tables")
    .where("table_schema", "sproot-test");

  tables = tables
    .map((table) => table.table_name as string)
    // Filter out knex migration tables and views
    .filter((table) => !table.includes("knex") && !table.includes("view"));

  await knex.raw("SET FOREIGN_KEY_CHECKS = 0;");
  for (const table of tables) {
    await knex(table).truncate();
  }
  await knex.raw("SET FOREIGN_KEY_CHECKS = 1;");

  console.log("Seeding test database...");

  await knex("users").insert([
    {
      username: "testuser",
      hash: "$2b$10$6Ld7cz9MRYEuYVJB1J/gcOWm2MXnSqxGZ/XIZJSAEWWQlqF1xci0.",
      email: "test@example.com",
    },
  ]);

  await knex("outputs").insert([
    {
      id: "1",
      model: Models.PCA9685,
      address: "0x40",
      name: "Relay #1",
      color: "#82c91e",
      pin: 0,
      isPwm: 0,
      isInvertedPwm: 0,
      automationTimeout: 1,
    },
    {
      id: "5",
      model: Models.PCA9685,
      address: "0x40",
      name: "Pwm #1",
      color: "#228be6",
      pin: 4,
      isPwm: 1,
      isInvertedPwm: 0,
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
      lowCalibrationPoint: null,
      highCalibrationPoint: null,
    },
    {
      id: 2,
      name: "DS18B20",
      model: "DS18B20",
      address: "28-583bd446df61",
      color: "#40c057",
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
}
