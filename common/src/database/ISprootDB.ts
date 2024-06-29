import { SDBSensor } from "@sproot/sproot-common/src/database/SDBSensor";
import { SDBOutput } from "@sproot/sproot-common/src/database/SDBOutput";
import { SDBReading } from "@sproot/sproot-common/src/database/SDBReading";
import { SDBUser } from "@sproot/sproot-common/src/database/SDBUser";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { ControlMode, IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";

interface ISprootDB {
  getSensorsAsync(): Promise<SDBSensor[]>;
  getSensorAsync(id: number): Promise<SDBSensor[]>;
  getDS18B20AddressesAsync(): Promise<SDBSensor[]>;
  addSensorAsync(sensor: SDBSensor): Promise<void>;
  updateSensorAsync(sensor: SDBSensor): Promise<void>;
  deleteSensorAsync(id: number): Promise<void>;
  addSensorReadingAsync(sensor: ISensorBase): Promise<void>;
  getSensorReadingsAsync(
    sensor: ISensorBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean,
  ): Promise<SDBReading[]>;
  getOutputsAsync(): Promise<SDBOutput[]>;
  getOutputAsync(id: number): Promise<SDBOutput[]>;
  addOutputAsync(output: SDBOutput): Promise<void>;
  updateOutputAsync(output: SDBOutput): Promise<void>;
  deleteOutputAsync(id: number): Promise<void>;
  addOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void>;
  getOutputStatesAsync(
    output: IOutputBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean,
  ): Promise<SDBOutputState[]>;
  getUserAsync(username: string): Promise<SDBUser[]>;
  addUserAsync(user: SDBUser): Promise<void>;
}

/* istanbul ignore next */
class MockSprootDB implements ISprootDB {
  async getOutputStatesAsync(
    _output: IOutputBase | { id: number },
    _since: Date,
    _minutes: number,
    _toIsoString: boolean,
  ): Promise<SDBOutputState[]> {
    return [];
  }

  async addOutputStateAsync(_output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return;
  }

  async getOutputsAsync(): Promise<SDBOutput[]> {
    return [];
  }

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

  /* eslint-disable */
  async getSensorReadingsAsync(
    _sensor: ISensorBase,
    _since: Date,
    _minutes?: number,
  ): Promise<SDBReading[]> {
    return [];
  }
  /* eslint-enable */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addSensorReadingAsync(_sensor: ISensorBase): Promise<void> {
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

export { MockSprootDB };
export type { ISprootDB };
