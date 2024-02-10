import mysql2 from "mysql2/promise";

import { SDBUser } from "@sproot/sproot-common/dist/database/SDBUser";
import { SDBSensor } from "@sproot/src/database/SDBSensor";
import { SDBOutput } from "@sproot/src/database/SDBOutput";
import { ISprootDB } from "@sproot/src/database/ISprootDB";
import { SensorBase, ReadingType } from "@sproot/src/sensors/SensorBase";
import { SDBReading } from "@sproot/src/database/SDBReading";

class SprootDB implements ISprootDB {
  #connection: mysql2.Connection;

  constructor(connection: mysql2.Connection) {
    this.#connection = connection;
  }

  async getSensorsAsync(): Promise<SDBSensor[]> {
    const [rows] = await this.#connection.execute<SDBSensor[]>("SELECT * FROM sensors");
    return rows;
  }

  async getSensorAsync(id: number): Promise<SDBSensor[]> {
    const [rows] = await this.#connection.execute<SDBSensor[]>(
      "SELECT * FROM sensors WHERE id = ?",
      [id],
    );
    return rows;
  }

  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    const [rows] = await this.#connection.execute<SDBSensor[]>(
      'SELECT address FROM sensors WHERE model = "DS18B20"',
    );
    return rows;
  }

  async addSensorAsync(sensor: SDBSensor): Promise<void> {
    await this.#connection.execute("INSERT INTO sensors (name, model, address) VALUES (?, ?, ?)", [
      sensor.name,
      sensor.model,
      sensor.address,
    ]);
  }

  async updateSensorAsync(sensor: SDBSensor): Promise<void> {
    await this.#connection.execute(
      "UPDATE sensors SET name = ?, model = ?, address = ? WHERE id = ?",
      [sensor.name, sensor.model, sensor.address, sensor.id],
    );
  }

  async deleteSensorAsync(id: number): Promise<void> {
    await this.#connection.execute("DELETE FROM sensors WHERE id = ?", [id]);
  }

  async getOutputsAsync(): Promise<SDBOutput[]> {
    const [rows] = await this.#connection.execute<SDBOutput[]>("SELECT * FROM outputs");
    return rows;
  }

  async getOutputAsync(id: number): Promise<SDBOutput[]> {
    const [rows] = await this.#connection.execute<SDBOutput[]>(
      "SELECT * FROM outputs WHERE id = ?",
      [id],
    );
    return rows;
  }

  async addOutputAsync(output: SDBOutput): Promise<void> {
    await this.#connection.execute(
      "INSERT INTO outputs (name, model, address, pin, isPwm, isInvertedPwm) VALUES (?, ?, ?, ?, ?, ?)",
      [output.name, output.model, output.address, output.pin, output.isPwm, output.isInvertedPwm],
    );
  }

  async updateOutputAsync(output: SDBOutput): Promise<void> {
    await this.#connection.execute(
      "UPDATE outputs SET name = ?, model = ?, address = ?, pin = ?, isPwm = ?, isInvertedPwm = ? WHERE id = ?",
      [
        output.name,
        output.model,
        output.address,
        output.pin,
        output.isPwm,
        output.isInvertedPwm,
        output.id,
      ],
    );
  }

  async deleteOutputAsync(id: number): Promise<void> {
    await this.#connection.execute("DELETE FROM outputs WHERE id = ?", [id]);
  }

  async addSensorReadingAsync(sensor: SensorBase): Promise<void> {
    for (const readingType in sensor.lastReading) {
      await this.#connection.execute(
        "INSERT INTO sensor_data (sensor_id, metric, data, units, logTime) VALUES (?, ?, ?, ?, ?)",
        [
          sensor.id,
          readingType,
          sensor.lastReading[readingType as ReadingType],
          sensor.units[readingType as ReadingType],
          sensor.lastReadingTime?.toISOString().slice(0, 19).replace("T", " "),
        ],
      );
    }
  }

  /**
   * Important note on this one:
   * The logTime is stored in the database in the format "YYYY-MM-DD HH:MM:SS". This is not a valid ISO string.
   * This function will convert the logTime to an ISO string if toIsoString is true. Otherwise, you should probably
   * this before you turn the returned date into a Date object as it'll be in a very different timezone and there'll
   * be some... Irregularities.
   * @param sensor sensor to fetch readings for.
   * @param since time at the start of the lookback period.
   * @param minutes minutes to lookback from since.
   * @param toIsoString whether to convert the logTime to an ISO string.
   * @returns An array of SDBReadings.
   */
  async getSensorReadingsAsync(
    sensor: SensorBase,
    since: Date,
    minutes: number = 120,
    toIsoString: boolean = false,
  ): Promise<SDBReading[]> {
    const [rows] = await this.#connection.execute<SDBReading[]>(
      `SELECT metric, data, units, logTime
      FROM sensors s
      JOIN (
        SELECT *
        FROM sensor_data
        WHERE logTime > DATE_SUB(?, INTERVAL ? MINUTE)
      ) AS d ON s.id=d.sensor_id
      WHERE sensor_id = ?
      ORDER BY logTime ASC`,
      [since.toISOString(), minutes, sensor.id],
    );
    if (toIsoString) {
      for (const row of rows) {
        row.logTime = row.logTime.replace(" ", "T") + "Z";
      }
    }
    return rows;
  }

  async getUserAsync(username: string): Promise<SDBUser[]> {
    const [rows] = await this.#connection.execute<SDBUser[]>(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );
    return rows;
  }

  async addUserAsync(credentials: SDBUser): Promise<void> {
    await this.#connection.execute("INSERT INTO users (username, hash, email) VALUES (?, ?, ?)", [
      credentials.username,
      credentials.hash,
      credentials.email,
    ]);
  }

  async disposeAsync(): Promise<void> {
    await this.#connection.end();
  }
}

export { SprootDB };
