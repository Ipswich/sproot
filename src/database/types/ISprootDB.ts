import { SDBUser } from "./SDBUser";
import { SDBSensor } from "./SDBSensor";
import { SensorBase } from "../../sensors/types/SensorBase";
import { SDBOutput } from "./SDBOutput";

interface ISprootDB {
  getSensorsAsync(): Promise<SDBSensor[]>;
  getSensorAsync(id: number): Promise<SDBSensor[]>;
  getDS18B20AddressesAsync(): Promise<SDBSensor[]>;
  addSensorAsync(sensor: SDBSensor): Promise<void>;
  updateSensorAsync(sensor: SDBSensor): Promise<void>;
  deleteSensorAsync(id: number): Promise<void>;
  addSensorReadingAsync(sensor: SensorBase): Promise<void>;
  getOutputsAsync(): Promise<SDBOutput[]>;
  getOutputAsync(id: number): Promise<SDBOutput[]>;
  addOutputAsync(output: SDBOutput): Promise<void>;
  updateOutputAsync(output: SDBOutput): Promise<void>;
  deleteOutputAsync(id: number): Promise<void>;
  getUserAsync(username: string): Promise<SDBUser[]>;
  addUserAsync(user: SDBUser): Promise<void>;
}

/* istanbul ignore next */
class MockSprootDB implements ISprootDB {
  async getOutputsAsync(): Promise<SDBOutput[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getOutputAsync(_id: number): Promise<SDBOutput[]> {
    return [];
  }

  async getSensorsAsync(): Promise<SDBSensor[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSensorAsync(_id: number): Promise<SDBSensor[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addSensorAsync(_sensor: SDBSensor): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateSensorAsync(_sensor: SDBSensor): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteSensorAsync(_id: number): Promise<void> {
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
  async updateOutputAsync(_output: SDBOutput): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteOutputAsync(_id: number): Promise<void> {
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
