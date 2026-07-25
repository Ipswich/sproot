import {
  IActionsRepository,
  IAutomationsRepository,
  ICameraRepository,
  IConditionsRepository,
  IDeviceZonesRepository,
  IJournalsRepository,
  IOutputsRepository,
  ISensorsRepository,
  ISubcontrollersRepository,
  ISystemRepository,
  ISprootDB,
  IUsersRepository,
} from "@sproot/common/dist/database/ISprootDB";
import { Knex } from "knex";
import { AutomationsRepository } from "./repositories/automations/AutomationsRepository";
import { ActionsRepository } from "./repositories/ActionsRepository";
import { CameraRepository } from "./repositories/camera/CameraRepository";
import { ConditionsRepository } from "./repositories/ConditionsRepository";
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
  readonly actions: IActionsRepository;
  readonly conditions: IConditionsRepository;
  readonly camera: ICameraRepository;
  readonly users: IUsersRepository;
  readonly deviceZones: IDeviceZonesRepository;
  readonly journals: IJournalsRepository;
  readonly system: ISystemRepository;

  #connection: Knex;

  constructor(connection: Knex) {
    this.#connection = connection;
    this.sensors = new SensorsRepository(connection);
    this.outputs = new OutputsRepository(connection);
    this.subcontrollers = new SubcontrollersRepository(connection);
    this.automations = new AutomationsRepository(connection);
    this.actions = new ActionsRepository(connection);
    this.conditions = new ConditionsRepository(connection);
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
