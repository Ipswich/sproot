import {
  IAutomationsRepository,
  ICameraRepository,
  IConditionsRepository,
  IDataQueriesRepository,
  IDeviceZonesRepository,
  IJournalsRepository,
  IOutputsRepository,
  ISensorsRepository,
  ISprootDB,
  ISubcontrollersRepository,
  ISystemRepository,
  IUsersRepository,
} from "@sproot/sproot-common/dist/database/ISprootDB";
import { Knex } from "knex";
import { AutomationsRepository } from "./repositories/AutomationsRepository";
import { CameraRepository } from "./repositories/CameraRepository";
import { ConditionsRepository } from "./repositories/ConditionsRepository";
import { DataQueriesRepository } from "./repositories/DataQueriesRepository";
import { DeviceZonesRepository } from "./repositories/DeviceZonesRepository";
import { InvalidCursorError } from "./repositories/BaseKnexRepository";
import { JournalsRepository } from "./repositories/JournalsRepository";
import { OutputsRepository } from "./repositories/OutputsRepository";
import { SensorsRepository } from "./repositories/SensorsRepository";
import { SubcontrollersRepository } from "./repositories/SubcontrollersRepository";
import { SystemRepository } from "./repositories/SystemRepository";
import { UsersRepository } from "./repositories/UsersRepository";

export class SprootDB {
  readonly sensors: ISensorsRepository;
  readonly outputs: IOutputsRepository;
  readonly subcontrollers: ISubcontrollersRepository;
  readonly automations: IAutomationsRepository;
  readonly conditions: IConditionsRepository;
  readonly camera: ICameraRepository;
  readonly users: IUsersRepository;
  readonly deviceZones: IDeviceZonesRepository;
  readonly journals: IJournalsRepository;
  readonly system: ISystemRepository;
  readonly dataQueries: IDataQueriesRepository;

  #connection: Knex;

  constructor(connection: Knex) {
    this.#connection = connection;
    this.sensors = new SensorsRepository(connection);
    this.outputs = new OutputsRepository(connection);
    this.subcontrollers = new SubcontrollersRepository(connection);
    this.automations = new AutomationsRepository(connection);
    this.conditions = new ConditionsRepository(connection);
    this.camera = new CameraRepository(connection);
    this.users = new UsersRepository(connection);
    this.deviceZones = new DeviceZonesRepository(connection);
    this.journals = new JournalsRepository(connection);
    this.system = new SystemRepository(connection);
    this.dataQueries = new DataQueriesRepository(connection);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#connection.destroy();
  }
}

export interface SprootDB extends ISprootDB {}
export { InvalidCursorError };
