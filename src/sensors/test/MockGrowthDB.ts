import { IGrowthDB } from '../../types/database-objects/IGrowthDB';
import { GDBSensor } from '../../types/database-objects/GDBSensor';
import { GDBUser } from '../../types/database-objects/GDBUser';
import { SensorBase } from '../../types/SensorBase';

class MockGrowthDB implements IGrowthDB {

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