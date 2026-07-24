import {
  IAutomationsRepository,
  ICameraRepository,
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
import { CameraRepository } from "./repositories/camera/CameraRepository";
import { NotificationActionsRepository } from "./repositories/automations/actions/NotificationActionsRepository";
import { OutputActionsRepository } from "./repositories/automations/actions/OutputActionsRepository";
import { DateRangeConditionsRepository } from "./repositories/automations/conditions/DateRangeConditionsRepository";
import { DeviceZonesRepository } from "./repositories/device-zones/DeviceZonesRepository";
import { InvalidCursorError } from "./repositories/utils/BaseKnexRepository";
import { JournalsRepository } from "./repositories/journals/JournalsRepository";
import { MonthConditionsRepository } from "./repositories/automations/conditions/MonthConditionsRepository";
import { OutputConditionsRepository } from "./repositories/automations/conditions/OutputConditionsRepository";
import { OutputsRepository } from "./repositories/outputs/OutputsRepository";
import { SensorConditionsRepository } from "./repositories/automations/conditions/SensorConditionsRepository";
import { SensorsRepository } from "./repositories/sensors/SensorsRepository";
import { SubcontrollersRepository } from "./repositories/subcontrollers/SubcontrollersRepository";
import { SystemRepository } from "./repositories/system/SystemRepository";
import { TimeConditionsRepository } from "./repositories/automations/conditions/TimeConditionsRepository";
import { UsersRepository } from "./repositories/users/UsersRepository";
import { WeekdayConditionsRepository } from "./repositories/automations/conditions/WeekdayConditionsRepository";

export class SprootDB {
  readonly sensors: ISensorsRepository;
  readonly outputs: IOutputsRepository;
  readonly subcontrollers: ISubcontrollersRepository;
  readonly automations: IAutomationsRepository;
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
    this.automations.actions = {
      output: new OutputActionsRepository(connection),
      notification: new NotificationActionsRepository(connection),
    };
    this.automations.conditions = {
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
