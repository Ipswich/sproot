import type { IAutomationsRepository } from "./repositories/automations/IAutomationsRepository";
import type { ICameraRepository } from "./repositories/camera/ICameraRepository";
import type { IDeviceZonesRepository } from "./repositories/device-zones/IDeviceZonesRepository";
import type { IJournalRepository } from "./repositories/journals/IJournalRepository";
import type { IOutputsRepository } from "./repositories/outputs/IOutputsRepository";
import type { ISensorsRepository } from "./repositories/sensors/ISensorsRepository";
import type { ISubcontrollersRepository } from "./repositories/subcontrollers/ISubcontrollersRepository";
import type { ISystemRepository } from "./repositories/system/ISystemRepository";
import type { ISettingsRepository } from "./settings/ISettingsRepository";
import type { ISprootDB } from "./ISprootDB";
import type { IUsersRepository } from "./repositories/users/IUsersRepository";
import { Knex } from "knex";
import { AutomationsRepository } from "./repositories/automations/AutomationsRepository";
import { CameraRepository } from "./repositories/camera/CameraRepository";
import { DeviceZonesRepository } from "./repositories/device-zones/DeviceZonesRepository";
import { InvalidCursorError } from "./repositories/utils/BaseKnexRepository";
import { JournalsRepository } from "./repositories/journals/JournalsRepository";
import { OutputsRepository } from "./repositories/outputs/OutputsRepository";
import { SensorsRepository } from "./repositories/sensors/SensorsRepository";
import { SubcontrollersRepository } from "./repositories/subcontrollers/SubcontrollersRepository";
import { SystemRepository } from "./repositories/system/SystemRepository";
import { SettingsRepository } from "./settings/SettingsRepository";
import { UsersRepository } from "./repositories/users/UsersRepository";

export class SprootDB {
  readonly sensors: ISensorsRepository;
  readonly outputs: IOutputsRepository;
  readonly subcontrollers: ISubcontrollersRepository;
  readonly automations: IAutomationsRepository;
  readonly camera: ICameraRepository;
  readonly users: IUsersRepository;
  readonly deviceZones: IDeviceZonesRepository;
  readonly journals: IJournalRepository;
  readonly system: ISystemRepository;
  readonly settings: ISettingsRepository;

  #connection: Knex;

  constructor(connection: Knex) {
    this.#connection = connection;
    this.sensors = new SensorsRepository(connection);
    this.outputs = new OutputsRepository(connection);
    this.subcontrollers = new SubcontrollersRepository(connection);
    this.automations = new AutomationsRepository(connection);
    this.camera = new CameraRepository(connection);
    this.users = new UsersRepository(connection);
    this.deviceZones = new DeviceZonesRepository(connection);
    this.journals = new JournalsRepository(connection);
    this.system = new SystemRepository(connection);
    this.settings = new SettingsRepository(connection);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#connection.destroy();
  }
}

export interface SprootDB extends ISprootDB {}
export { InvalidCursorError };
