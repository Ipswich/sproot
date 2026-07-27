import type { IAutomationsRepository } from "@sproot/common/database/automations/IAutomationsRepository";
import type { ICameraRepository } from "@sproot/common/database/camera/ICameraRepository";
import type { IDeviceZonesRepository } from "@sproot/common/database/device-zones/IDeviceZonesRepository";
import type { IJournalRepository } from "@sproot/common/database/journals/IJournalRepository";
import type { IOutputsRepository } from "@sproot/common/database/outputs/IOutputsRepository";
import type { ISensorsRepository } from "@sproot/common/database/sensors/ISensorsRepository";
import type { ISubcontrollersRepository } from "@sproot/common/database/subcontrollers/ISubcontrollersRepository";
import type { ISystemRepository } from "@sproot/common/database/system/ISystemRepository";
import type { ISprootDB } from "@sproot/common/database/ISprootDB";
import type { IUsersRepository } from "@sproot/common/database/users/IUsersRepository";
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
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#connection.destroy();
  }
}

export interface SprootDB extends ISprootDB {}
export { InvalidCursorError };
