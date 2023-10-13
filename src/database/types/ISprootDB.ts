import { SDBUser } from "./SDBUser";
import { SDBSensor } from "./SDBSensor";
import { SensorBase } from "../../sensors/types/SensorBase";
import { SDBOutput } from "./SDBOutput";

interface ISprootDB {
  getSensorsAsync(): Promise<SDBSensor[]>;
  getDS18B20AddressesAsync(): Promise<SDBSensor[]>;
  addSensorAsync(sensor: SDBSensor): Promise<void>;
  getOutputsAsync(): Promise<SDBOutput[]>;
  addSensorReadingAsync(sensor: SensorBase): Promise<void>;
  addOutputAsync(output: SDBOutput): Promise<void>;
  getUserAsync(username: string): Promise<SDBUser[]>;
  addUserAsync(user: SDBUser): Promise<void>;
}

/* istanbul ignore next */
class MockSprootDB implements ISprootDB {
  async getOutputsAsync(): Promise<SDBOutput[]> {
    return [];
  }

  async getSensorsAsync(): Promise<SDBSensor[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addSensorAsync(_sensor: SDBSensor): Promise<void> {
    return;
  }

  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addOutputAsync(_output: SDBOutput): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addSensorReadingAsync(_sensor: SensorBase): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUserAsync(_username: string): Promise<SDBUser[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addUserAsync(_user: SDBUser): Promise<void> {
    return;
  }
}

export { ISprootDB, MockSprootDB };
