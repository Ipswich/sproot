/* eslint-disable @typescript-eslint/no-unused-vars */
// Domain repository interfaces and mocks for local use in ISprootDB / MockSprootDB
import { ISensorsRepository } from "./sensors/ISensorsRepository";
import { MockSensorsRepository } from "./sensors/ISensorsRepository";
import { IOutputsRepository } from "./outputs/IOutputsRepository";
import { MockOutputsRepository } from "./outputs/IOutputsRepository";
import { ISubcontrollersRepository } from "./subcontrollers/ISubcontrollersRepository";
import { MockSubcontrollersRepository } from "./subcontrollers/ISubcontrollersRepository";
import { IAutomationsRepository } from "./automations/IAutomationsRepository";
import { MockAutomationsRepository } from "./automations/IAutomationsRepository";
import { ICameraRepository } from "./camera/ICameraRepository";
import { MockCameraRepository } from "./camera/ICameraRepository";
import { IUsersRepository } from "./users/IUsersRepository";
import { MockUsersRepository } from "./users/IUsersRepository";
import { IDeviceZonesRepository } from "./device-zones/IDeviceZonesRepository";
import { MockDeviceZonesRepository } from "./device-zones/IDeviceZonesRepository";
import { ISystemRepository } from "./system/ISystemRepository";
import { MockSystemRepository } from "./system/ISystemRepository";
import { IJournalsRepository } from "./journals/IJournalsRepository";
import { MockJournalsRepository } from "./journals/IJournalsRepository";

// Re-export all repository interfaces and mock classes for backward compatibility
export type { ISensorsRepository } from "./sensors/ISensorsRepository";
export type { IOutputsRepository } from "./outputs/IOutputsRepository";
export type { ISubcontrollersRepository } from "./subcontrollers/ISubcontrollersRepository";
export type { IAutomationsRepository, IActionsRepository } from "./automations/IAutomationsRepository";
export type { IConditionsRepository } from "./automations/conditions/IConditionsRepository";
export type { IOutputActionsRepository } from "./automations/actions/IOutputActionsRepository";
export type { INotificationActionsRepository } from "./automations/actions/INotificationActionsRepository";
export type { IBaseConditionsRepository, IActionBaseRepository } from "./automations/conditions/IBaseConditionsRepository";
export type { ISensorConditionsRepository } from "./automations/conditions/ISensorConditionsRepository";
export type { IOutputConditionsRepository } from "./automations/conditions/IOutputConditionsRepository";
export type { ITimeConditionsRepository } from "./automations/conditions/ITimeConditionsRepository";
export type { IWeekdayConditionsRepository } from "./automations/conditions/IWeekdayConditionsRepository";
export type { IMonthConditionsRepository } from "./automations/conditions/IMonthConditionsRepository";
export type { IDateRangeConditionsRepository } from "./automations/conditions/IDateRangeConditionsRepository";
export type { ICameraRepository } from "./camera/ICameraRepository";
export type { IUsersRepository } from "./users/IUsersRepository";
export type { IDeviceZonesRepository } from "./device-zones/IDeviceZonesRepository";
export type { ISystemRepository } from "./system/ISystemRepository";
export type { IJournalsRepository } from "./journals/IJournalsRepository";

export { MockSensorsRepository } from "./sensors/ISensorsRepository";
export { MockOutputsRepository } from "./outputs/IOutputsRepository";
export { MockSubcontrollersRepository } from "./subcontrollers/ISubcontrollersRepository";
export { MockAutomationsRepository } from "./automations/IAutomationsRepository";
export { MockOutputActionsRepository } from "./automations/actions/IOutputActionsRepository";
export { MockNotificationActionsRepository } from "./automations/actions/INotificationActionsRepository";
export { MockSensorConditionsRepository } from "./automations/conditions/ISensorConditionsRepository";
export { MockOutputConditionsRepository } from "./automations/conditions/IOutputConditionsRepository";
export { MockTimeConditionsRepository } from "./automations/conditions/ITimeConditionsRepository";
export { MockWeekdayConditionsRepository } from "./automations/conditions/IWeekdayConditionsRepository";
export { MockMonthConditionsRepository } from "./automations/conditions/IMonthConditionsRepository";
export { MockDateRangeConditionsRepository } from "./automations/conditions/IDateRangeConditionsRepository";
export { MockCameraRepository } from "./camera/ICameraRepository";
export { MockUsersRepository } from "./users/IUsersRepository";
export { MockDeviceZonesRepository } from "./device-zones/IDeviceZonesRepository";
export { MockSystemRepository } from "./system/ISystemRepository";
export { MockJournalsRepository } from "./journals/IJournalsRepository";

export interface ISprootDB {
  sensors: ISensorsRepository;
  outputs: IOutputsRepository;
  subcontrollers: ISubcontrollersRepository;
  automations: IAutomationsRepository;
  camera: ICameraRepository;
  users: IUsersRepository;
  deviceZones: IDeviceZonesRepository;
  system: ISystemRepository;
  journals: IJournalsRepository;
  [Symbol.asyncDispose](): Promise<void>;
}

export class MockSprootDB implements ISprootDB {
  sensors = new MockSensorsRepository();
  outputs = new MockOutputsRepository();
  subcontrollers = new MockSubcontrollersRepository();
  automations = new MockAutomationsRepository();
  camera = new MockCameraRepository();
  users = new MockUsersRepository();
  deviceZones = new MockDeviceZonesRepository();
  system = new MockSystemRepository();
  journals = new MockJournalsRepository();

  async [Symbol.asyncDispose](): Promise<void> {
    return Promise.resolve();
  }
}
