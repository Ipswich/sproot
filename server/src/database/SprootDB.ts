import {
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
} from "@sproot/sproot-common/dist/database/ISprootDB";
import { Knex } from "knex";
import { AutomationsRepository } from "./repositories/AutomationsRepository";
import { CameraRepository } from "./repositories/CameraRepository";
import { DateRangeConditionsRepository } from "./repositories/DateRangeConditionsRepository";
import { DeviceZonesRepository } from "./repositories/DeviceZonesRepository";
import { InvalidCursorError } from "./repositories/BaseKnexRepository";
import { JournalsRepository } from "./repositories/JournalsRepository";
import { MonthConditionsRepository } from "./repositories/MonthConditionsRepository";
import { OutputConditionsRepository } from "./repositories/OutputConditionsRepository";
import { OutputsRepository } from "./repositories/OutputsRepository";
import { SensorConditionsRepository } from "./repositories/SensorConditionsRepository";
import { SensorsRepository } from "./repositories/SensorsRepository";
import { SubcontrollersRepository } from "./repositories/SubcontrollersRepository";
import { SystemRepository } from "./repositories/SystemRepository";
import { TimeConditionsRepository } from "./repositories/TimeConditionsRepository";
import { UsersRepository } from "./repositories/UsersRepository";
import { WeekdayConditionsRepository } from "./repositories/WeekdayConditionsRepository";

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

  #connection: Knex;

  constructor(connection: Knex) {
    this.#connection = connection;
    this.sensors = new SensorsRepository(connection);
    this.outputs = new OutputsRepository(connection);
    this.subcontrollers = new SubcontrollersRepository(connection);
    this.automations = new AutomationsRepository(connection);
    this.conditions = {
      sensor: new SensorConditionsRepository(connection),
      output: new OutputConditionsRepository(connection),
      time: new TimeConditionsRepository(connection),
      weekday: new WeekdayConditionsRepository(connection),
      month: new MonthConditionsRepository(connection),
      dateRange: new DateRangeConditionsRepository(connection),
    };
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
