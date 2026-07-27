import type { IAutomationsRepository } from "./repositories/automations/IAutomationsRepository";
import type { ICameraRepository } from "./repositories/camera/ICameraRepository";
import type { IDeviceZonesRepository } from "./repositories/device-zones/IDeviceZonesRepository";
import type { IJournalRepository } from "./repositories/journals/IJournalRepository";
import type { IOutputsRepository } from "./repositories/outputs/IOutputsRepository";
import type { ISensorsRepository } from "./repositories/sensors/ISensorsRepository";
import type { ISubcontrollersRepository } from "./repositories/subcontrollers/ISubcontrollersRepository";
import type { ISystemRepository } from "./repositories/system/ISystemRepository";
import type { IUsersRepository } from "./repositories/users/IUsersRepository";
import type { ISettingsRepository } from "./settings/ISettingsRepository";

export interface ISprootDB {
  sensors: ISensorsRepository;
  outputs: IOutputsRepository;
  subcontrollers: ISubcontrollersRepository;
  automations: IAutomationsRepository;
  camera: ICameraRepository;
  users: IUsersRepository;
  deviceZones: IDeviceZonesRepository;
  system: ISystemRepository;
  settings: ISettingsRepository;
  journals: IJournalRepository;
  [Symbol.asyncDispose](): Promise<void>;
}
