/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBSensor } from "@sproot/sproot-common/src/database/SDBSensor";
import { SDBOutput } from "@sproot/sproot-common/src/database/SDBOutput";
import { SDBSubcontroller } from "@sproot/sproot-common/src/database/SDBSubcontroller";
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
import { SDBNotificationAction } from "./SDBNotificationAction";
import { SDBWeekdayCondition } from "./SDBWeekdayCondition";
import { SDBMonthCondition } from "./SDBMonthCondition";
import { SDBDateRangeCondition } from "./SDBDateRangeCondition";
import { IWeekdayCondition } from "../automation/IWeekdayCondition";
import { IMonthCondition } from "@sproot/automation/IMonthCondition";
import { IDateRangeCondition } from "@sproot/automation/IDateRangeCondition";
import { SDBCameraSettings } from "./SDBCameraSettings";
import { SDBDeviceZone } from "./SDBDeviceZone";
import { SDBJournal } from "./SDBJournal";
import { SDBJournalTag } from "./SDBJournalTag";
import { SDBJournalTagLookup } from "./SDBJournalTagLookup";
import { SDBJournalEntry } from "./SDBJournalEntry";
import { SDBJournalEntryTag } from "./SDBJournalEntryTag";
import { SDBJournalEntryTagLookup } from "./SDBJournalEntryTagLookup";
import {
  SensorDataQueryRequest,
  OutputDataQueryRequest,
  SensorDataQueryResponse,
  OutputDataQueryResponse,
  DeviceDataQueryRow,
} from "@sproot/api/v2/QueryTypes";
import * as winston from "winston";

export interface ISensorsRepository {
  getAllAsync(): Promise<SDBSensor[]>;
  getByIdAsync(id: number): Promise<SDBSensor[]>;
  getDS18B20AddressesAsync(): Promise<SDBSensor[]>;
  addAsync(sensor: SDBSensor): Promise<void>;
  updateAsync(sensor: SDBSensor): Promise<void>;
  updateSensorCalibrationAsync(
    sensorId: number,
    lowCalibrationPoint: number,
    highCalibrationPoint: number,
  ): Promise<void>;
  deleteAsync(id: number): Promise<void>;
  addSensorReadingAsync(sensor: ISensorBase): Promise<void>;
  getSensorReadingsAsync(
    sensor: ISensorBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean,
  ): Promise<SDBReading[]>;
  getBucketedSensorReadingsAsync(
    sensor: ISensorBase | { id: number },
    since: Date,
    minutes: number,
    bucketMinutes: number,
    toIsoString: boolean,
  ): Promise<SDBReading[]>;
  getDataAsync(request: SensorDataQueryRequest): Promise<SensorDataQueryResponse>;
}

export interface IOutputsRepository {
  getAllAsync(): Promise<SDBOutput[]>;
  getByIdAsync(id: number): Promise<SDBOutput[]>;
  addAsync(output: SDBOutput): Promise<number>;
  updateAsync(output: SDBOutput): Promise<void>;
  deleteAsync(id: number): Promise<void>;
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
  getBucketedOutputStatesAsync(
    output: IOutputBase | { id: number },
    since: Date,
    minutes: number,
    bucketMinutes: number,
    toIsoString: boolean,
  ): Promise<SDBOutputState[]>;
  getDataAsync(request: OutputDataQueryRequest): Promise<OutputDataQueryResponse>;
}

export interface ISubcontrollersRepository {
  getAllAsync(): Promise<SDBSubcontroller[]>;
  addAsync(sensor: SDBSubcontroller): Promise<number>;
  updateAsync(sensor: SDBSubcontroller): Promise<number>;
  deleteAsync(id: number): Promise<number>;
}

export interface IAutomationsRepository {
  getAllAsync(): Promise<SDBAutomation[]>;
  getByIdAsync(automationId: number): Promise<SDBAutomation[]>;
  addAsync(name: string, operator: AutomationOperator): Promise<number>;
  updateAsync(
    name: string,
    operator: AutomationOperator,
    id: number,
    enabled: boolean,
  ): Promise<void>;
  deleteAsync(automationId: number): Promise<void>;

  getOutputActionsAsync(): Promise<SDBOutputAction[]>;
  getOutputActionsByAutomationIdAsync(automationId: number): Promise<SDBOutputAction[]>;
  getOutputActionAsync(outputActionId: number): Promise<SDBOutputAction[]>;
  addOutputActionAsync(automationId: number, outputId: number, value: number): Promise<number>;
  deleteOutputActionAsync(outputActionId: number): Promise<void>;
  getOutputActionsByOutputIdAsync(outputId: number): Promise<SDBOutputAction[]>;

  // Notifications
  getNotificationActionsAsync(): Promise<SDBNotificationAction[]>;
  getNotificationActionByIdAsync(notificationActionId: number): Promise<SDBNotificationAction[]>;
  getNotificationActionsByAutomationIdAsync(automationId: number): Promise<SDBNotificationAction[]>;
  addNotificationActionAsync(
    automationId: number,
    subject: string,
    content: string,
  ): Promise<number>;
  deleteNotificationActionAsync(notificationActionId: number): Promise<void>;

  getAutomationsForOutputAsync(outputId: number): Promise<SDBOutputActionView[]>;
}

export interface IBaseConditionsRepository<T> {
  getAsync(automationId: number): Promise<T[]>;
  addAsync(automationId: number, ...params: unknown[]): Promise<number>;
  updateAsync(automationId: number, condition: T): Promise<void>;
  deleteAsync(conditionId: number): Promise<void>;
}

export interface ISensorConditionsRepository extends IBaseConditionsRepository<SDBSensorCondition> {
  addAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    sensorId: number,
    readingType: string,
  ): Promise<number>;
  updateAsync(automationId: number, condition: ISensorCondition): Promise<void>;
}

export class MockSensorConditionsRepository implements ISensorConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBSensorCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _operator: ConditionOperator,
    _comparisonValue: number,
    _comparisonLookback: number | null,
    _sensorId: number,
    _readingType: string,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: ISensorCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}

export interface IOutputConditionsRepository extends IBaseConditionsRepository<SDBOutputCondition> {
  addAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    outputId: number,
  ): Promise<number>;
  updateAsync(automationId: number, condition: IOutputCondition): Promise<void>;
}

export class MockOutputConditionsRepository implements IOutputConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBOutputCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _operator: ConditionOperator,
    _comparisonValue: number,
    _comparisonLookback: number | null,
    _outputId: number,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: IOutputCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}

export interface ITimeConditionsRepository extends IBaseConditionsRepository<SDBTimeCondition> {
  addAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    endTime: string | undefined | null,
  ): Promise<number>;
  updateAsync(automationId: number, condition: ITimeCondition): Promise<void>;
}

export class MockTimeConditionsRepository implements ITimeConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBTimeCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _startTime: string | undefined | null,
    _endTime: string | undefined | null,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: ITimeCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}

export interface IWeekdayConditionsRepository extends IBaseConditionsRepository<SDBWeekdayCondition> {
  addAsync(automationId: number, groupType: ConditionGroupType, weekdays: number): Promise<number>;
  updateAsync(automationId: number, condition: IWeekdayCondition): Promise<void>;
}

export class MockWeekdayConditionsRepository implements IWeekdayConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBWeekdayCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _groupType: ConditionGroupType,
    _weekdays: number,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: IWeekdayCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}

export interface IMonthConditionsRepository extends IBaseConditionsRepository<SDBMonthCondition> {
  addAsync(automationId: number, groupType: ConditionGroupType, months: number): Promise<number>;
  updateAsync(automationId: number, condition: IMonthCondition): Promise<void>;
}

export class MockMonthConditionsRepository implements IMonthConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBMonthCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _groupType: ConditionGroupType,
    _months: number,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: IMonthCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}

export interface IDateRangeConditionsRepository
  extends IBaseConditionsRepository<SDBDateRangeCondition> {
  addAsync(
    automationId: number,
    groupType: ConditionGroupType,
    startMonth: number,
    startDate: number,
    endMonth: number,
    endDate: number,
  ): Promise<number>;
  updateAsync(automationId: number, condition: IDateRangeCondition): Promise<void>;
}

export class MockDateRangeConditionsRepository implements IDateRangeConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBDateRangeCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _groupType: ConditionGroupType,
    _startMonth: number,
    _startDate: number,
    _endMonth: number,
    _endDate: number,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: IDateRangeCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}

export type IConditionsRepository = {
  sensor: ISensorConditionsRepository;
  output: IOutputConditionsRepository;
  time: ITimeConditionsRepository;
  weekday: IWeekdayConditionsRepository;
  month: IMonthConditionsRepository;
  dateRange: IDateRangeConditionsRepository;
};

export interface ICameraRepository {
  getAllAsync(): Promise<SDBCameraSettings[]>;
  // addCameraSettingsAsync(SDBCameraSettings: SDBCameraSettings): Promise<number>;
  updateAsync(SDBCameraSettings: SDBCameraSettings): Promise<void>;
  // deleteCameraSettingsAsync(cameraId: number): Promise<void>;
}

export interface IUsersRepository {
  getByIdAsync(username: string): Promise<SDBUser[]>;
  addAsync(user: SDBUser): Promise<void>;
}

export interface IDeviceZonesRepository {
  getAllAsync(): Promise<SDBDeviceZone[]>;
  addAsync(name: string): Promise<number>;
  updateAsync(deviceZone: SDBDeviceZone): Promise<void>;
  deleteAsync(id: number): Promise<void>;
}

export interface ISystemRepository {
  getDatabaseSizeAsync(): Promise<number>;
  backupDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    outputFile: string,
    logger: winston.Logger,
  ): Promise<void>;

  validateBackupArchiveAsync(inputFile: string, logger: winston.Logger): Promise<void>;

  swapRestoreDatabaseAsync(
    host: string,
    port: number,
    user: string,
    password: string,
    inputFile: string,
    logger: winston.Logger,
  ): Promise<void>;

  deleteOldDatabaseAsync(logger: winston.Logger): Promise<void>;

  refreshAllAggregateTablesAsync(logger: winston.Logger): Promise<void>;
}

export interface IJournalsRepository {
  getAllAsync(): Promise<SDBJournal[]>;
  getByIdAsync(id: number): Promise<SDBJournal[]>;
  addAsync(
    name: string,
    description: string | null,
    icon: string | null,
    color: string | null,
    startDate?: string | null,
  ): Promise<number>;
  updateAsync(journal: SDBJournal): Promise<void>;
  deleteAsync(id: number): Promise<void>;

  getJournalTagsAsync(): Promise<SDBJournalTag[]>;
  addJournalTagAsync(name: string, color: string | null): Promise<number>;
  updateJournalTagAsync(tag: SDBJournalTag): Promise<void>;
  deleteJournalTagAsync(id: number): Promise<void>;

  getJournalTagLookupsAsync(): Promise<SDBJournalTagLookup[]>;
  addJournalTagLookupAsync(journalId: number, tagId: number): Promise<number>;
  deleteJournalTagLookupAsync(journalId: number, tagId: number): Promise<void>;

  getJournalEntriesAsync(journalId: number, withContent?: boolean): Promise<SDBJournalEntry[]>;
  getJournalEntryAsync(entryId: number, withContent?: boolean): Promise<SDBJournalEntry[]>;
  addJournalEntryAsync(
    journalId: number,
    name: string | null,
    text: string,
    createdAt?: string | null,
  ): Promise<number>;
  updateJournalEntryAsync(entry: SDBJournalEntry): Promise<void>;
  deleteJournalEntryAsync(id: number): Promise<void>;

  getJournalEntryTagsAsync(): Promise<SDBJournalEntryTag[]>;
  addJournalEntryTagAsync(name: string, color: string | null): Promise<number>;
  updateJournalEntryTagAsync(tag: SDBJournalEntryTag): Promise<void>;
  deleteJournalEntryTagAsync(id: number): Promise<void>;

  getJournalEntryTagLookupsAsync(): Promise<SDBJournalEntryTagLookup[]>;
  addJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<number>;
  deleteJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<void>;
}

export interface ISprootDB {
  sensors: ISensorsRepository;
  outputs: IOutputsRepository;
  subcontrollers: ISubcontrollersRepository;
  automations: IAutomationsRepository;
  conditions: IConditionsRepository;
  camera: ICameraRepository;
  users: IUsersRepository;
  deviceZones: IDeviceZonesRepository;
  system: ISystemRepository;
  journals: IJournalsRepository;
  [Symbol.asyncDispose](): Promise<void>;
}

class MockSprootDB implements ISprootDB {
  sensors = new MockSensorsRepository();
  outputs = new MockOutputsRepository();
  subcontrollers = new MockSubcontrollersRepository();
  automations = new MockAutomationsRepository();
  conditions = {
    sensor: new MockSensorConditionsRepository(),
    output: new MockOutputConditionsRepository(),
    time: new MockTimeConditionsRepository(),
    weekday: new MockWeekdayConditionsRepository(),
    month: new MockMonthConditionsRepository(),
    dateRange: new MockDateRangeConditionsRepository(),
  };
  camera = new MockCameraRepository();
  users = new MockUsersRepository();
  deviceZones = new MockDeviceZonesRepository();
  system = new MockSystemRepository();
  journals = new MockJournalsRepository();

  async [Symbol.asyncDispose](): Promise<void> {
    return Promise.resolve();
  }
}

export class MockUsersRepository implements IUsersRepository {
  async getByIdAsync(_username: string): Promise<SDBUser[]> {
    return [];
  }
  async addAsync(_user: SDBUser): Promise<void> {
    return;
  }
}

export class MockCameraRepository implements ICameraRepository {
  async getAllAsync(): Promise<SDBCameraSettings[]> {
    return [];
  }
  async updateAsync(_cameraSettings: SDBCameraSettings): Promise<void> {
    return;
  }
}

export class MockDeviceZonesRepository implements IDeviceZonesRepository {
  async getAllAsync(): Promise<SDBDeviceZone[]> {
    return [];
  }
  async addAsync(_name: string): Promise<number> {
    return 0;
  }
  async updateAsync(_deviceZone: SDBDeviceZone): Promise<void> {
    return;
  }
  async deleteAsync(_id: number): Promise<void> {
    return;
  }
}

export class MockSubcontrollersRepository implements ISubcontrollersRepository {
  async getAllAsync(): Promise<SDBSubcontroller[]> {
    return [];
  }
  async addAsync(_subcontroller: SDBSubcontroller): Promise<number> {
    return 0;
  }
  async updateAsync(_subcontroller: SDBSubcontroller): Promise<number> {
    return 0;
  }
  async deleteAsync(_id: number): Promise<number> {
    return 0;
  }
}

export class MockOutputsRepository implements IOutputsRepository {
  async getAllAsync(): Promise<SDBOutput[]> {
    return [];
  }
  async getByIdAsync(_id: number): Promise<SDBOutput[]> {
    return [];
  }
  async addAsync(_output: SDBOutput): Promise<number> {
    return 0;
  }
  async updateAsync(_output: SDBOutput): Promise<void> {
    return;
  }
  async deleteAsync(_id: number): Promise<void> {
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
  async addOutputStateAsync(_output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
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
  async getBucketedOutputStatesAsync(
    _output: IOutputBase | { id: number },
    _since: Date,
    _minutes: number,
    _bucketMinutes: number,
    _toIsoString: boolean,
  ): Promise<SDBOutputState[]> {
    return [];
  }
  async getDataAsync(_request: OutputDataQueryRequest): Promise<OutputDataQueryResponse> {
    return { xAxis: { field: "time", values: [] }, data: {} as DeviceDataQueryRow };
  }
}

export class MockSensorsRepository implements ISensorsRepository {
  async getAllAsync(): Promise<SDBSensor[]> {
    return [];
  }
  async getByIdAsync(_id: number): Promise<SDBSensor[]> {
    return [];
  }
  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    return [];
  }
  async addAsync(_sensor: SDBSensor): Promise<void> {
    return;
  }
  async updateAsync(_sensor: SDBSensor): Promise<void> {
    return;
  }
  async updateSensorCalibrationAsync(
    _sensorId: number,
    _lowCalibrationPoint: number,
    _highCalibrationPoint: number,
  ): Promise<void> {
    return;
  }
  async deleteAsync(_id: number): Promise<void> {
    return;
  }
  async addSensorReadingAsync(_sensor: ISensorBase): Promise<void> {
    return;
  }
  async getSensorReadingsAsync(
    _sensor: ISensorBase | { id: number },
    _since: Date,
    _minutes: number,
    _toIsoString: boolean,
  ): Promise<SDBReading[]> {
    return [];
  }
  async getBucketedSensorReadingsAsync(
    _sensor: ISensorBase | { id: number },
    _since: Date,
    _minutes: number,
    _bucketMinutes: number,
    _toIsoString: boolean,
  ): Promise<SDBReading[]> {
    return [];
  }
  async getDataAsync(_request: SensorDataQueryRequest): Promise<SensorDataQueryResponse> {
    return { xAxis: { field: "time", values: [] }, data: {} as DeviceDataQueryRow };
  }
}

export class MockSystemRepository implements ISystemRepository {
  async getDatabaseSizeAsync(): Promise<number> {
    return 0;
  }
  async backupDatabaseAsync(
    _host: string,
    _port: number,
    _user: string,
    _password: string,
    _outputFile: string,
    _logger: winston.Logger,
  ): Promise<void> {
    return;
  }
  async validateBackupArchiveAsync(_inputFile: string, _logger: winston.Logger): Promise<void> {
    return;
  }
  async swapRestoreDatabaseAsync(
    _host: string,
    _port: number,
    _user: string,
    _password: string,
    _inputFile: string,
    _logger: winston.Logger,
  ): Promise<void> {
    return;
  }
  async deleteOldDatabaseAsync(_logger: winston.Logger): Promise<void> {
    return;
  }
  async refreshAllAggregateTablesAsync(_logger: winston.Logger): Promise<void> {
    return;
  }
}

export class MockAutomationsRepository implements IAutomationsRepository {
  async getAllAsync(): Promise<SDBAutomation[]> {
    return [];
  }
  async getByIdAsync(_automationId: number): Promise<SDBAutomation[]> {
    return [];
  }
  async addAsync(_name: string, _operator: AutomationOperator): Promise<number> {
    return 0;
  }
  async updateAsync(
    _name: string,
    _operator: AutomationOperator,
    _id: number,
    _enabled: boolean,
  ): Promise<void> {
    return;
  }
  async deleteAsync(_automationId: number): Promise<void> {
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
  async getOutputActionsByOutputIdAsync(_outputId: number): Promise<SDBOutputAction[]> {
    return [];
  }
  async getNotificationActionsAsync(): Promise<SDBNotificationAction[]> {
    return [];
  }
  async getNotificationActionByIdAsync(
    _notificationActionId: number,
  ): Promise<SDBNotificationAction[]> {
    return [];
  }
  async getNotificationActionsByAutomationIdAsync(
    _automationId: number,
  ): Promise<SDBNotificationAction[]> {
    return [];
  }
  async addNotificationActionAsync(
    _automationId: number,
    _subject: string,
    _content: string,
  ): Promise<number> {
    return 0;
  }
  async deleteNotificationActionAsync(_notificationActionId: number): Promise<void> {
    return;
  }
  async getAutomationsForOutputAsync(_outputId: number): Promise<SDBOutputActionView[]> {
    return [];
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
}

class MockJournalsRepository implements IJournalsRepository {
  async getAllAsync(): Promise<SDBJournal[]> {
    return [];
  }
  async getByIdAsync(_id: number): Promise<SDBJournal[]> {
    return [];
  }
  async addAsync(
    _name: string,
    _description: string | null,
    _icon: string | null,
    _color: string | null,
    _startDate?: string | null,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_journal: SDBJournal): Promise<void> {
    return;
  }
  async deleteAsync(_id: number): Promise<void> {
    return;
  }

  async getJournalTagsAsync(): Promise<SDBJournalTag[]> {
    return [];
  }
  async addJournalTagAsync(_name: string, _color: string | null): Promise<number> {
    return 0;
  }
  async updateJournalTagAsync(_tag: SDBJournalTag): Promise<void> {
    return;
  }
  async deleteJournalTagAsync(_id: number): Promise<void> {
    return;
  }

  async getJournalTagLookupsAsync(): Promise<SDBJournalTagLookup[]> {
    return [];
  }
  async addJournalTagLookupAsync(_journalId: number, _tagId: number): Promise<number> {
    return 0;
  }
  async deleteJournalTagLookupAsync(_journalId: number, _tagId: number): Promise<void> {
    return;
  }

  async getJournalEntriesAsync(
    _journalId: number,
    _withContent?: boolean,
  ): Promise<SDBJournalEntry[]> {
    return [];
  }
  async getJournalEntryAsync(_entryId: number, _withContent?: boolean): Promise<SDBJournalEntry[]> {
    return [];
  }
  async addJournalEntryAsync(
    _journalId: number,
    _name: string | null,
    _text: string,
    _createdAt?: string | null,
  ): Promise<number> {
    return 0;
  }
  async updateJournalEntryAsync(_entry: SDBJournalEntry): Promise<void> {
    return;
  }
  async deleteJournalEntryAsync(_id: number): Promise<void> {
    return;
  }

  async getJournalEntryTagsAsync(): Promise<SDBJournalEntryTag[]> {
    return [];
  }
  async addJournalEntryTagAsync(_name: string, _color: string | null): Promise<number> {
    return 0;
  }
  async updateJournalEntryTagAsync(_tag: SDBJournalEntryTag): Promise<void> {
    return;
  }
  async deleteJournalEntryTagAsync(_id: number): Promise<void> {
    return;
  }

  async getJournalEntryTagLookupsAsync(): Promise<SDBJournalEntryTagLookup[]> {
    return [];
  }
  async addJournalEntryTagLookupAsync(_journalEntryId: number, _tagId: number): Promise<number> {
    return 0;
  }
  async deleteJournalEntryTagLookupAsync(_journalEntryId: number, _tagId: number): Promise<void> {
    return;
  }
}

export { MockSprootDB, MockJournalsRepository };
