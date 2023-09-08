import { GDBUser } from './GDBUser';
import { GDBSensor } from './GDBSensor';
import { SensorBase } from '../SensorBase';

interface IGrowthDB {
  getSensors(): Promise<GDBSensor[]>;
  addSensor(sensor: GDBSensor): Promise<void>;
  getDS18B20Addresses(): Promise<GDBSensor[]>;
  addSensorReading(sensor: SensorBase): Promise<void>;
  getUser(username: string): Promise<GDBUser[]>;
}

export { IGrowthDB };