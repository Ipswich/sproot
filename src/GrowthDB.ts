import mysql2 from 'mysql2/promise';

import { GDBUser } from './types/database-objects/GDBUser';
import { GDBSensor } from './types/database-objects/GDBSensor';
import { SensorBase, ReadingType } from './types/SensorBase';


class GrowthDB {
  #connection: mysql2.Connection;

  constructor(connection: mysql2.Connection) {
    this.#connection = connection;
  }

  async getSensors() : Promise<GDBSensor[]>{
    const [rows] = await this.#connection.execute<GDBSensor[]>('SELECT * FROM sensors');
    return rows;
  }

  async addSensor(sensor: GDBSensor) : Promise<void>{
    await this.#connection.execute('INSERT INTO sensors (description, model, address) VALUES (?, ?, ?)', [sensor.description, sensor.model, sensor.address]);
  }

  async getDS1B20Addresses() : Promise<GDBSensor[]>{
    const [rows] = await this.#connection.execute<GDBSensor[]>('SELECT address FROM sensors WHERE model = "DS18B20"');
    return rows;
  }

  async addSensorReading(sensor: SensorBase){
    for (const readingType in sensor.lastReading){
      await this.#connection.execute('INSERT INTO sensor_data (sensor_id, metric, data, unit) VALUES (?, ?, ?, ?)', [sensor.id, readingType, sensor.lastReading[readingType as ReadingType], sensor.getUnits(readingType as ReadingType)]);
    }
  }

  async getUser(username: string) : Promise<GDBUser[]>{
    const [rows] = await this.#connection.execute<GDBUser[]>('SELECT * FROM users WHERE username = ?', [username]);
    return rows;
  }
}

export { GrowthDB };