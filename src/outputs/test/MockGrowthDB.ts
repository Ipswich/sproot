import { IGrowthDB } from '../../types/database-objects/IGrowthDB';
import { GDBSensor } from '../../types/database-objects/GDBSensor';
import { GDBUser } from '../../types/database-objects/GDBUser';
import { SensorBase } from '../../types/SensorBase';
import { GDBOutput } from '../../types/database-objects/GDBOutput';

class MockGrowthDB implements IGrowthDB {
  async getOutputs(): Promise<GDBOutput[]> {
    return [];
  }

  async getSensors() : Promise<GDBSensor[]>{
    return [];
  }

  async addSensor(_sensor: GDBSensor) : Promise<void>{
    return;
  }

  async getDS18B20Addresses() : Promise<GDBSensor[]>{
    return [];
  }

  async addSensorReading(_sensor: SensorBase){
    return;
  }

  async getUser(_username: string) : Promise<GDBUser[]>{
    return [];
  }
}

export { MockGrowthDB };