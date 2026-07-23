/* eslint-disable @typescript-eslint/no-unused-vars */
// Domain repository interfaces and mocks for local use in ISprootDB / MockSprootDB
import { ISensorsRepository, MockSensorsRepository } from "./sensors/ISensors.repository";
import { IOutputsRepository, MockOutputsRepository } from "./outputs/IOutputs.repository";
import { ISubcontrollersRepository, MockSubcontrollersRepository } from "./subcontrollers/ISubcontrollers.repository";
import { IAutomationsRepository, MockAutomationsRepository } from "./automations/IAutomations.repository";
import { ICameraRepository, MockCameraRepository } from "./camera/ICamera.repository";
import { IUsersRepository, MockUsersRepository } from "./users/IUsers.repository";
import { IDeviceZonesRepository, MockDeviceZonesRepository } from "./device-zones/IDeviceZones.repository";
import { ISystemRepository, MockSystemRepository } from "./system/ISystem.repository";
import { IJournalsRepository, MockJournalsRepository } from "./journals/IJournals.repository";

// Re-export all repository interfaces and mock classes for backward compatibility
export type { ISensorsRepository } from "./sensors/ISensors.repository";
export type { IOutputsRepository } from "./outputs/IOutputs.repository";
export type { ISubcontrollersRepository } from "./subcontrollers/ISubcontrollers.repository";
export type { IAutomationsRepository, IActionsRepository, IConditionsRepository } from "./automations/IAutomations.repository";
export type { IOutputActionsRepository } from "./automations/actions/IOutputActions.repository";
export type { INotificationActionsRepository } from "./automations/actions/INotificationActions.repository";
export type { IBaseConditionsRepository, IActionBaseRepository } from "./automations/conditions/IBaseConditions.repository";
export type { ISensorConditionsRepository } from "./automations/conditions/ISensorConditions.repository";
export type { IOutputConditionsRepository } from "./automations/conditions/IOutputConditions.repository";
export type { ITimeConditionsRepository } from "./automations/conditions/ITimeConditions.repository";
export type { IWeekdayConditionsRepository } from "./automations/conditions/IWeekdayConditions.repository";
export type { IMonthConditionsRepository } from "./automations/conditions/IMonthConditions.repository";
export type { IDateRangeConditionsRepository } from "./automations/conditions/IDateRangeConditions.repository";
export type { ICameraRepository } from "./camera/ICamera.repository";
export type { IUsersRepository } from "./users/IUsers.repository";
export type { IDeviceZonesRepository } from "./device-zones/IDeviceZones.repository";
export type { ISystemRepository } from "./system/ISystem.repository";
export type { IJournalsRepository } from "./journals/IJournals.repository";
export { MockSensorsRepository } from "./sensors/ISensors.repository";
export { MockOutputsRepository } from "./outputs/IOutputs.repository";
export { MockSubcontrollersRepository } from "./subcontrollers/ISubcontrollers.repository";
export { MockAutomationsRepository } from "./automations/IAutomations.repository";
export { MockOutputActionsRepository } from "./automations/actions/IOutputActions.repository";
export { MockNotificationActionsRepository } from "./automations/actions/INotificationActions.repository";
export { MockSensorConditionsRepository } from "./automations/conditions/ISensorConditions.repository";
export { MockOutputConditionsRepository } from "./automations/conditions/IOutputConditions.repository";
export { MockTimeConditionsRepository } from "./automations/conditions/ITimeConditions.repository";
export { MockWeekdayConditionsRepository } from "./automations/conditions/IWeekdayConditions.repository";
export { MockMonthConditionsRepository } from "./automations/conditions/IMonthConditions.repository";
export { MockDateRangeConditionsRepository } from "./automations/conditions/IDateRangeConditions.repository";
export { MockCameraRepository } from "./camera/ICamera.repository";
export { MockUsersRepository } from "./users/IUsers.repository";
export { MockDeviceZonesRepository } from "./device-zones/IDeviceZones.repository";
export { MockSystemRepository } from "./system/ISystem.repository";
export { MockJournalsRepository } from "./journals/IJournals.repository";

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
