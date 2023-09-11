import { GDBUser } from './GDBUser';
import { GDBSensor } from './GDBSensor';
import { SensorBase } from '../SensorBase';
import { GDBOutput } from './GDBOutput';

interface IGrowthDB {
  getSensors(): Promise<GDBSensor[]>;
  getDS18B20Addresses(): Promise<GDBSensor[]>;
  addSensor(sensor: GDBSensor): Promise<void>;
  getOutputs(): Promise<GDBOutput[]>;
  addSensorReading(sensor: SensorBase): Promise<void>;
  getUser(username: string): Promise<GDBUser[]>;
}

export { IGrowthDB };