import mysql2 from 'mysql2/promise';

import { SDBUser } from './types/SDBUser';
import { SDBSensor } from './types/SDBSensor';
import { SDBOutput } from './types/SDBOutput';
import { ISprootDB } from './types/ISprootDB';
import { SensorBase, ReadingType } from '../sensors/types/SensorBase';

class SprootDB implements ISprootDB {
  #connection: mysql2.Connection;

  constructor(connection: mysql2.Connection) {
    this.#connection = connection;
  }

  async getSensorsAsync() : Promise<SDBSensor[]> {
    const [rows] = await this.#connection.execute<SDBSensor[]>('SELECT * FROM sensors');
    return rows;
  }
  
  async getDS18B20AddressesAsync() : Promise<SDBSensor[]> {
    const [rows] = await this.#connection.execute<SDBSensor[]>('SELECT address FROM sensors WHERE model = "DS18B20"');
    return rows;
  }

  async addSensorAsync(sensor: SDBSensor) : Promise<void> {
    await this.#connection.execute('INSERT INTO sensors (description, model, address) VALUES (?, ?, ?)', [sensor.description, sensor.model, sensor.address]);
  }

  async getOutputsAsync() : Promise<SDBOutput[]> {
    const [rows] = await this.#connection.execute<SDBOutput[]>('SELECT * FROM outputs');
    return rows;
  }

  async addSensorReadingAsync(sensor: SensorBase) : Promise<void> {
    for (const readingType in sensor.lastReading){
      await this.#connection.execute('INSERT INTO sensor_data (sensor_id, metric, data, unit) VALUES (?, ?, ?, ?)', [sensor.id, readingType, sensor.lastReading[readingType as ReadingType], sensor.units[readingType as ReadingType]]);
    }
  }

  async getUserAsync(username: string) : Promise<SDBUser[]> {
    const [rows] = await this.#connection.execute<SDBUser[]>('SELECT * FROM users WHERE username = ?', [username]);
    return rows;
  }

  async disposeAsync() : Promise<void> {
    await this.#connection.end();
  }
}

export { SprootDB };