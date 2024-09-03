import { SDBSensor } from "@sproot/sproot-common/src/database/SDBSensor";
import { SDBOutput } from "@sproot/sproot-common/src/database/SDBOutput";
import { SDBReading } from "@sproot/sproot-common/src/database/SDBReading";
import { SDBUser } from "@sproot/sproot-common/src/database/SDBUser";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { ControlMode, IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";
import { SDBAutomation } from "@sproot/sproot-common/src/database/SDBAutomation";
import { SDBSensorAutomationCondition } from "@sproot/sproot-common/src/database/SDBSensorAutomationCondition";
import { SDBOutputAutomationCondition } from "@sproot/sproot-common/src/database/SDBOutputAutomationCondition";
import { ConditionGroupType, ConditionOperator } from "@sproot/sproot-common/src/automation/ICondition";
import { SDBTimeAutomationCondition } from "@sproot/sproot-common/src/database/SDBTimeAutomationCondition";
import { AutomationOperator, IAutomation } from "@sproot/sproot-common/src/automation/IAutomation";
import { ITimeCondition } from "../automation/ITimeCondition";
import { IOutputCondition } from "../automation/IOutputCondition";
import { ISensorCondition } from "../automation/ISensorCondition";

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

  getAutomationsAsync(outputId: number): Promise<SDBAutomation[]>;
  getAutomationAsync(automationId: number): Promise<SDBAutomation[]>;
  addAutomationAsync(name: string, outputId: number, value: number, operator: AutomationOperator): Promise<number>;
  updateAutomationAsync(automation: IAutomation): Promise<void>;
  deleteAutomationAsync(automationId: number): Promise<void>;

  getSensorAutomationConditionsAsync(automationId: number): Promise<SDBSensorAutomationCondition[]>;
  addSensorAutomationConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    sensorId: number,
    readingType: string): Promise<number>;
  updateSensorAutomationConditionAsync(automationId: number, condition: ISensorCondition): Promise<void>;
  deleteSensorAutomationConditionAsync(conditionId: number): Promise<void>;

  getOutputAutomationConditionsAsync(automationId: number): Promise<SDBOutputAutomationCondition[]>;
  addOutputAutomationConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    outputId: number): Promise<number>;
  updateOutputAutomationConditionAsync(automationId: number, condition: IOutputCondition): Promise<void>;
  deleteOutputAutomationConditionAsync(conditionId: number): Promise<void>;

  getTimeAutomationConditionsAsync(automationId: number): Promise<SDBTimeAutomationCondition[]>;
  addTimeAutomationConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    endTime: string | undefined | null,
  ): Promise<number>;
  updateTimeAutomationConditionAsync(automationId: number, condition: ITimeCondition): Promise<void>;
  deleteTimeAutomationConditionAsync(conditionId: number): Promise<void>;

  getUserAsync(username: string): Promise<SDBUser[]>;
  addUserAsync(user: SDBUser): Promise<void>;
}

class MockSprootDB implements ISprootDB {
  async getTimeAutomationConditionsAsync(_automationId: number): Promise<SDBTimeAutomationCondition[]> {
    throw new Error("Method not implemented.");
  }
  async addTimeAutomationConditionAsync(_automationId: number, _type: ConditionGroupType, _startTime: string | null, _endTime: string | null): Promise<number> {
    throw new Error("Method not implemented.");
  }
  async updateTimeAutomationConditionAsync(_automationId: number, _condition: ITimeCondition): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async deleteTimeAutomationConditionAsync(_conditionId: number): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async deleteSensorAutomationConditionsExceptAsync(_automationId: number, _exceptConditionIds: number[]): Promise<void> {
    return;
  }
  async deleteOutputAutomationConditionsExceptAsync(_automationId: number, _exceptConditionIds: number[]): Promise<void> {
    return;
  }
  async getAutomationsAsync(_outputId: number): Promise<SDBAutomation[]> {
    return [];
  }
  async getAutomationAsync(_automationId: number): Promise<SDBAutomation[]> {
    return [];
  }
  async addAutomationAsync(_name: string, _outputId: number, _value: number, _operator: AutomationOperator): Promise<number> {
    return 0;
  }
  async updateAutomationAsync(_automation: SDBAutomation): Promise<void> {
    return;
  }
  async deleteAutomationAsync(_automationId: number): Promise<void> {
    return;
  }
  async getSensorAutomationConditionsAsync(
    _automationId: number,
  ): Promise<SDBSensorAutomationCondition[]> {
    return [];
  }
  async addSensorAutomationConditionAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _operator: ConditionOperator,
    _comparisonValue: number,
    _sensorId: number,
    _readingType: string,
  ): Promise<number> {
    return 0;
  }
  async updateSensorAutomationConditionAsync(
    _automationId: number,
    _condition: ISensorCondition,
  ): Promise<void> {
    return;
  }
  async deleteSensorAutomationConditionAsync(_conditionId: number): Promise<void> {
    return;
  }
  async getOutputAutomationConditionsAsync(
    _automationId: number,
  ): Promise<SDBOutputAutomationCondition[]> {
    return [];
  }
  async addOutputAutomationConditionAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _operator: ConditionOperator,
    _comparisonValue: number,
    _outputId: number,
  ): Promise<number> {
    return 0;
  }
  async updateOutputAutomationConditionAsync(
    _automationId: number,
    _condition: IOutputCondition,
  ): Promise<void> {
    return;
  }
  async deleteOutputAutomationConditionAsync(_conditionId: number): Promise<void> {
    return;
  }

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
