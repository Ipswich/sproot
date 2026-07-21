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

type RepositoryKey =
  | "sensors"
  | "outputs"
  | "subcontrollers"
  | "automations"
  | "conditions"
  | "camera"
  | "users"
  | "deviceZones"
  | "journals"
  | "system"
  | "dataQueries";

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

composeRepositoryMethods(SprootDB, "sensors", SensorsRepository.prototype);
composeRepositoryMethods(SprootDB, "outputs", OutputsRepository.prototype);
composeRepositoryMethods(SprootDB, "subcontrollers", SubcontrollersRepository.prototype);
composeRepositoryMethods(SprootDB, "automations", AutomationsRepository.prototype);
composeRepositoryMethods(SprootDB, "conditions", ConditionsRepository.prototype);
composeRepositoryMethods(SprootDB, "camera", CameraRepository.prototype);
composeRepositoryMethods(SprootDB, "users", UsersRepository.prototype);
composeRepositoryMethods(SprootDB, "deviceZones", DeviceZonesRepository.prototype);
composeRepositoryMethods(SprootDB, "journals", JournalsRepository.prototype);
composeRepositoryMethods(SprootDB, "system", SystemRepository.prototype);
composeRepositoryMethods(SprootDB, "dataQueries", DataQueriesRepository.prototype);

function composeRepositoryMethods(
  targetClass: new (...args: never[]) => SprootDB,
  repositoryKey: RepositoryKey,
  repositoryPrototype: object,
): void {
  for (const propertyName of Object.getOwnPropertyNames(repositoryPrototype)) {
    if (propertyName === "constructor") {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(repositoryPrototype, propertyName);
    if (!descriptor || typeof descriptor.value !== "function") {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(targetClass.prototype, propertyName)) {
      continue;
    }

    Object.defineProperty(targetClass.prototype, propertyName, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function (this: SprootDB, ...args: unknown[]) {
        const repository = this[repositoryKey] as unknown as Record<
          string,
          ((...innerArgs: unknown[]) => unknown) | undefined
        >;
        const method = repository[propertyName];
        if (!method) {
          throw new Error(`Repository method ${propertyName} is not available on ${repositoryKey}`);
        }
        return method.apply(repository, args);
      },
    });
  }
}

export { InvalidCursorError };