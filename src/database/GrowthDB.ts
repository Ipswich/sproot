import mysql2 from 'mysql2/promise';

import { GDBUser } from './types/GDBUser';
import { GDBSensor } from './types/GDBSensor';
import { GDBOutput } from './types/GDBOutput';
import { IGrowthDB } from './types/IGrowthDB';
import { SensorBase, ReadingType } from '../sensors/types/SensorBase';

class GrowthDB implements IGrowthDB {
  #connection: mysql2.Connection;

  constructor(connection: mysql2.Connection) {
    this.#connection = connection;
  }

  async getSensorsAsync() : Promise<GDBSensor[]> {
    const [rows] = await this.#connection.execute<GDBSensor[]>('SELECT * FROM sensors');
    return rows;
  }
  
  async getDS18B20AddressesAsync() : Promise<GDBSensor[]> {
    const [rows] = await this.#connection.execute<GDBSensor[]>('SELECT address FROM sensors WHERE model = "DS18B20"');
    return rows;
  }

  async addSensorAsync(sensor: GDBSensor) : Promise<void> {
    await this.#connection.execute('INSERT INTO sensors (description, model, address) VALUES (?, ?, ?)', [sensor.description, sensor.model, sensor.address]);
  }

  async getOutputsAsync() : Promise<GDBOutput[]> {
    const [rows] = await this.#connection.execute<GDBOutput[]>('SELECT * FROM outputs');
    return rows;
  }

  async addSensorReadingAsync(sensor: SensorBase) : Promise<void> {
    for (const readingType in sensor.lastReading){
      await this.#connection.execute('INSERT INTO sensor_data (sensor_id, metric, data, unit) VALUES (?, ?, ?, ?)', [sensor.id, readingType, sensor.lastReading[readingType as ReadingType], sensor.units[readingType as ReadingType]]);
    }
  }

  async getUserAsync(username: string) : Promise<GDBUser[]> {
    const [rows] = await this.#connection.execute<GDBUser[]>('SELECT * FROM users WHERE username = ?', [username]);
    return rows;
  }

  async disposeAsync() : Promise<void> {
    await this.#connection.end();
  }
}

export { GrowthDB };