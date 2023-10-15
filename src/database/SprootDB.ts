import mysql2 from "mysql2/promise";

import { SDBUser } from "./types/SDBUser";
import { SDBSensor } from "./types/SDBSensor";
import { SDBOutput } from "./types/SDBOutput";
import { ISprootDB } from "./types/ISprootDB";
import { SensorBase, ReadingType } from "../sensors/types/SensorBase";
import { SDBReading } from "./types/SDBReading";

class SprootDB implements ISprootDB {
  #connection: mysql2.Connection;

  constructor(connection: mysql2.Connection) {
    this.#connection = connection;
  }

  async getSensorsAsync(): Promise<SDBSensor[]> {
    const [rows] = await this.#connection.execute<SDBSensor[]>(
      "SELECT * FROM sensors",
    );
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
    await this.#connection.execute(
      "INSERT INTO sensors (description, model, address) VALUES (?, ?, ?)",
      [sensor.description, sensor.model, sensor.address],
    );
  }

  async updateSensorAsync(sensor: SDBSensor): Promise<void> {
    await this.#connection.execute(
      "UPDATE sensors SET description = ?, model = ?, address = ? WHERE id = ?",
      [sensor.description, sensor.model, sensor.address, sensor.id],
    );
  }

  async deleteSensorAsync(id: number): Promise<void> {
    await this.#connection.execute("DELETE FROM sensors WHERE id = ?", [id]);
  }

  async getOutputsAsync(): Promise<SDBOutput[]> {
    const [rows] = await this.#connection.execute<SDBOutput[]>(
      "SELECT * FROM outputs",
    );
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
      "INSERT INTO outputs (description, model, address, pin, isPwm, isInvertedPwm) VALUES (?, ?, ?, ?, ?, ?)",
      [
        output.description,
        output.model,
        output.address,
        output.pin,
        output.isPwm,
        output.isInvertedPwm,
      ],
    );
  }

  async updateOutputAsync(output: SDBOutput): Promise<void> {
    await this.#connection.execute(
      "UPDATE outputs SET description = ?, model = ?, address = ?, pin = ?, isPwm = ?, isInvertedPwm = ? WHERE id = ?",
      [
        output.description,
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
        "INSERT INTO sensor_data (sensor_id, metric, data, unit) VALUES (?, ?, ?, ?)",
        [
          sensor.id,
          readingType,
          sensor.lastReading[readingType as ReadingType],
          sensor.units[readingType as ReadingType],
        ],
      );
    }
  }

  async getSensorReadingsAsync(
    sensor: SensorBase,
    since: Date,
    minutes: number = 120,
  ): Promise<SDBReading[]> {
    const [rows] = await this.#connection.execute<SDBReading[]>(
      `
    SELECT metric, data, unit, logTime
      FROM Sensors s
      JOIN (
        SELECT *
        FROM sensor_data
        WHERE logTime > DATE_SUB(?, INTERVAL ? MINUTE)
      ) AS d ON s.id=d.sensor_id
      WHERE sensor_id = ?
      ORDER BY logTime ASC`,
      [since.toISOString(), minutes, sensor.id],
    );
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
    await this.#connection.execute(
      "INSERT INTO users (username, hash, email) VALUES (?, ?, ?)",
      [credentials.username, credentials.hash, credentials.email],
    );
  }

  async disposeAsync(): Promise<void> {
    await this.#connection.end();
  }
}

export { SprootDB };
