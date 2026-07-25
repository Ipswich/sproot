/* eslint-disable @typescript-eslint/no-unused-vars */
// Domain repository interfaces
import { ISensorsRepository } from "./sensors/ISensorsRepository";
import { IOutputsRepository } from "./outputs/IOutputsRepository";
import { ISubcontrollersRepository } from "./subcontrollers/ISubcontrollersRepository";
import { IAutomationsRepository } from "./automations/IAutomationsRepository";
import { ICameraRepository } from "./camera/ICameraRepository";
import { IUsersRepository } from "./users/IUsersRepository";
import { IDeviceZonesRepository } from "./device-zones/IDeviceZonesRepository";
import { ISystemRepository } from "./system/ISystemRepository";
import { IJournalsRepository } from "./journals/IJournalsRepository";
import { IActionsRepository } from "./automations/IAutomationsRepository";
import { IConditionsRepository } from "./automations/conditions/IConditionsRepository";

export interface ISprootDB {
  sensors: ISensorsRepository;
  outputs: IOutputsRepository;
  subcontrollers: ISubcontrollersRepository;
  automations: IAutomationsRepository;
  actions: IActionsRepository;
  conditions: IConditionsRepository;
  camera: ICameraRepository;
  users: IUsersRepository;
  deviceZones: IDeviceZonesRepository;
  system: ISystemRepository;
  journals: IJournalsRepository;
  [Symbol.asyncDispose](): Promise<void>;
}
