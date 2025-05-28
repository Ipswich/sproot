/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBSensor } from "@sproot/sproot-common/src/database/SDBSensor";
import { SDBOutput } from "@sproot/sproot-common/src/database/SDBOutput";
import { SDBReading } from "@sproot/sproot-common/src/database/SDBReading";
import { SDBUser } from "@sproot/sproot-common/src/database/SDBUser";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { ControlMode, IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";
import { SDBAutomation } from "@sproot/sproot-common/src/database/SDBAutomation";
import { SDBSensorCondition } from "@sproot/sproot-common/src/database/SDBSensorCondition";
import { SDBOutputCondition } from "@sproot/sproot-common/src/database/SDBOutputCondition";
import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/sproot-common/src/automation/ConditionTypes";
import { SDBTimeCondition } from "@sproot/sproot-common/src/database/SDBTimeCondition";
import { AutomationOperator } from "@sproot/sproot-common/src/automation/IAutomation";
import { ITimeCondition } from "../automation/ITimeCondition";
import { IOutputCondition } from "../automation/IOutputCondition";
import { ISensorCondition } from "../automation/ISensorCondition";
import { SDBOutputAction, SDBOutputActionView } from "./SDBOutputAction";
import { SDBWeekdayCondition } from "./SDBWeekdayCondition";
import { IWeekdayCondition } from "../automation/IWeekdayCondition";
import { SDBCameraSettings } from "./SDBCameraSettings";

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
  updateLastOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void>;
  getLastOutputStateAsync(outputId: number): Promise<SDBOutputState[]>;
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

  getAutomationsAsync(): Promise<SDBAutomation[]>;
  getAutomationAsync(automationId: number): Promise<SDBAutomation[]>;
  addAutomationAsync(name: string, operator: AutomationOperator): Promise<number>;
  updateAutomationAsync(name: string, operator: AutomationOperator, id: number): Promise<void>;
  deleteAutomationAsync(automationId: number): Promise<void>;

  getOutputActionsAsync(): Promise<SDBOutputAction[]>;
  getOutputActionsByAutomationIdAsync(automationId: number): Promise<SDBOutputAction[]>;
  getOutputActionAsync(outputActionId: number): Promise<SDBOutputAction[]>;
  addOutputActionAsync(automationId: number, outputId: number, value: number): Promise<number>;
  deleteOutputActionAsync(outputActionId: number): Promise<void>;

  getAutomationsForOutputAsync(outputId: number): Promise<SDBOutputActionView[]>;

  getSensorConditionsAsync(automationId: number): Promise<SDBSensorCondition[]>;
  addSensorConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    sensorId: number,
    readingType: string,
  ): Promise<number>;
  updateSensorConditionAsync(automationId: number, condition: ISensorCondition): Promise<void>;
  deleteSensorConditionAsync(conditionId: number): Promise<void>;

  getOutputConditionsAsync(automationId: number): Promise<SDBOutputCondition[]>;
  addOutputConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    outputId: number,
  ): Promise<number>;
  updateOutputConditionAsync(automationId: number, condition: IOutputCondition): Promise<void>;
  deleteOutputConditionAsync(conditionId: number): Promise<void>;

  getTimeConditionsAsync(automationId: number): Promise<SDBTimeCondition[]>;
  addTimeConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    endTime: string | undefined | null,
  ): Promise<number>;
  updateTimeConditionAsync(automationId: number, condition: ITimeCondition): Promise<void>;
  deleteTimeConditionAsync(conditionId: number): Promise<void>;

  getWeekdayConditionsAsync(automationId: number): Promise<SDBWeekdayCondition[]>;
  addWeekdayConditionAsync(
    automationId: number,
    groupType: ConditionGroupType,
    weekdays: number,
  ): Promise<number>;
  updateWeekdayConditionAsync(automationId: number, condition: IWeekdayCondition): Promise<void>;
  deleteWeekdayConditionAsync(conditionId: number): Promise<void>;

  getCameraSettingsAsync(): Promise<SDBCameraSettings[]>;
  // addCameraSettingsAsync(SDBCameraSettings: SDBCameraSettings): Promise<number>;
  updateCameraSettingsAsync(SDBCameraSettings: SDBCameraSettings): Promise<void>;
  // deleteCameraSettingsAsync(cameraId: number): Promise<void>;

  getUserAsync(username: string): Promise<SDBUser[]>;
  addUserAsync(user: SDBUser): Promise<void>;
}

class MockSprootDB implements ISprootDB {
  async getWeekdayConditionsAsync(_automationId: number): Promise<SDBWeekdayCondition[]> {
    return [];
  }
  async addWeekdayConditionAsync(
    _automationId: number,
    _groupType: ConditionGroupType,
    _weekdays: number,
  ): Promise<number> {
    return 0;
  }
  async updateWeekdayConditionAsync(
    _automationId: number,
    _condition: IWeekdayCondition,
  ): Promise<void> {
    return;
  }
  async deleteWeekdayConditionAsync(_conditionId: number): Promise<void> {
    return;
  }
  async getOutputActionsAsync(): Promise<SDBOutputAction[]> {
    return [];
  }
  async getOutputActionsByAutomationIdAsync(_automationId: number): Promise<SDBOutputAction[]> {
    return [];
  }
  async getOutputActionAsync(_outputActionId: number): Promise<SDBOutputAction[]> {
    return [];
  }
  async addOutputActionAsync(
    _automationId: number,
    _outputId: number,
    _value: number,
  ): Promise<number> {
    return 0;
  }
  async deleteOutputActionAsync(_outputActionId: number): Promise<void> {
    return;
  }

  async getAutomationsForOutputAsync(_outputId: number): Promise<SDBOutputActionView[]> {
    return [];
  }

  async getTimeConditionsAsync(_automationId: number): Promise<SDBTimeCondition[]> {
    return [];
  }
  async addTimeConditionAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _startTime: string | null,
    _endTime: string | null,
  ): Promise<number> {
    return 1;
  }
  async updateTimeConditionAsync(_automationId: number, _condition: ITimeCondition): Promise<void> {
    return;
  }
  async deleteTimeConditionAsync(_conditionId: number): Promise<void> {
    return;
  }
  async deleteSensorAutomationConditionsExceptAsync(
    _automationId: number,
    _exceptConditionIds: number[],
  ): Promise<void> {
    return;
  }
  async deleteOutputAutomationConditionsExceptAsync(
    _automationId: number,
    _exceptConditionIds: number[],
  ): Promise<void> {
    return;
  }
  async getAutomationsAsync(): Promise<SDBAutomation[]> {
    return [];
  }
  async getAutomationAsync(_automationId: number): Promise<SDBAutomation[]> {
    return [];
  }
  async addAutomationAsync(_name: string, _operator: AutomationOperator): Promise<number> {
    return 0;
  }
  async updateAutomationAsync(
    _name: string,
    _operator: AutomationOperator,
    _id: number,
  ): Promise<void> {
    return;
  }
  async deleteAutomationAsync(_automationId: number): Promise<void> {
    return;
  }
  async getSensorConditionsAsync(_automationId: number): Promise<SDBSensorCondition[]> {
    return [];
  }
  async addSensorConditionAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _operator: ConditionOperator,
    _comparisonValue: number,
    _sensorId: number,
    _readingType: string,
  ): Promise<number> {
    return 0;
  }
  async updateSensorConditionAsync(
    _automationId: number,
    _condition: ISensorCondition,
  ): Promise<void> {
    return;
  }
  async deleteSensorConditionAsync(_conditionId: number): Promise<void> {
    return;
  }
  async getOutputConditionsAsync(_automationId: number): Promise<SDBOutputCondition[]> {
    return [];
  }
  async addOutputConditionAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _operator: ConditionOperator,
    _comparisonValue: number,
    _outputId: number,
  ): Promise<number> {
    return 0;
  }
  async updateOutputConditionAsync(
    _automationId: number,
    _condition: IOutputCondition,
  ): Promise<void> {
    return;
  }
  async deleteOutputConditionAsync(_conditionId: number): Promise<void> {
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

  async updateLastOutputStateAsync(_output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return;
  }

  async getLastOutputStateAsync(_outputId: number): Promise<SDBOutputState[]> {
    return [];
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

  async getSensorAsync(_id: number): Promise<SDBSensor[]> {
    return [];
  }

  async addSensorAsync(_sensor: SDBSensor): Promise<void> {
    return;
  }

  async updateSensorAsync(_sensor: SDBSensor): Promise<void> {
    return;
  }

  async deleteSensorAsync(_id: number): Promise<void> {
    return;
  }

  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    return [];
  }

  async addOutputAsync(_output: SDBOutput): Promise<void> {
    return;
  }

  async updateOutputAsync(_output: SDBOutput): Promise<void> {
    return;
  }

  async deleteOutputAsync(_id: number): Promise<void> {
    return;
  }

  async getSensorReadingsAsync(
    _sensor: ISensorBase,
    _since: Date,
    _minutes?: number,
  ): Promise<SDBReading[]> {
    return [];
  }

  async addSensorReadingAsync(_sensor: ISensorBase): Promise<void> {
    return;
  }

  async getCameraSettingsAsync(): Promise<SDBCameraSettings[]> {
    return [];
  }

  // async addCameraSettingsAsync(
  //   _name: string,
  //   _xVideoResolution: number | null,
  //   _yVideoResolution: number | null,
  //   _videoFps: number,
  //   _xImageResolution: number | null,
  //   _yImageResolution: number | null,
  //   _imageRetentionDays: number,
  //   _imageRetentionSize: number,
  //   _timelapseEnabled: boolean,
  //   _timelapseInterval: number | null,
  // ): Promise<number> {
  //   return 0;
  // }

  async updateCameraSettingsAsync(_cameraSettings: SDBCameraSettings): Promise<void> {
    return;
  }

  async deleteCameraSettingsAsync(_cameraId: number): Promise<void> {
    return;
  }

  async getUserAsync(_username: string): Promise<SDBUser[]> {
    return [];
  }

  async addUserAsync(_user: SDBUser): Promise<void> {
    return;
  }
}

export { MockSprootDB };
export type { ISprootDB };
