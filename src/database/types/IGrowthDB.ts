import { GDBUser } from './GDBUser';
import { GDBSensor } from './GDBSensor';
import { SensorBase } from '../../sensors/types/SensorBase';
import { GDBOutput } from './GDBOutput';

interface IGrowthDB {
  getSensorsAsync(): Promise<GDBSensor[]>;
  getDS18B20AddressesAsync(): Promise<GDBSensor[]>;
  addSensorAsync(sensor: GDBSensor): Promise<void>;
  getOutputsAsync(): Promise<GDBOutput[]>;
  addSensorReadingAsync(sensor: SensorBase): Promise<void>;
  getUserAsync(username: string): Promise<GDBUser[]>;
}

/* istanbul ignore next */
class MockGrowthDB implements IGrowthDB {
  async getOutputsAsync(): Promise<GDBOutput[]> {
    return [];
  }

  async getSensorsAsync() : Promise<GDBSensor[]>{
    return [];
  }

  async addSensorAsync(_sensor: GDBSensor) : Promise<void>{
    return;
  }

  async getDS18B20AddressesAsync() : Promise<GDBSensor[]>{
    return [];
  }

  async addSensorReadingAsync(_sensor: SensorBase) : Promise<void>{
    return;
  }

  async getUserAsync(_username: string) : Promise<GDBUser[]>{
    return [];
  }
}

export { IGrowthDB, MockGrowthDB };