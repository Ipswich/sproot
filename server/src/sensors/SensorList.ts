import { BME280 } from "./BME280";
import { DS18B20 } from "./DS18B20";
import {
  DisposableSensorBase,
  ISensorBase,
  SensorBase,
} from "@sproot/sproot-common/dist/sensors/SensorBase";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";

class SensorList {
  #sprootDB: ISprootDB;
  #sensors: Record<string, SensorBase | DisposableSensorBase> = {};
  #logger: winston.Logger;

  constructor(sprootDB: ISprootDB, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#logger = logger;
  }

  get sensors(): Record<string, SensorBase | DisposableSensorBase> {
    return this.#sensors;
  }

  get sensorData(): Record<string, ISensorBase> {
    const cleanObject: Record<string, ISensorBase> = {};
    for (const key in this.#sensors) {
      const { id, description, model, address, lastReading, lastReadingTime, units } = this
        .#sensors[key] as ISensorBase;
      cleanObject[key] = {
        id,
        description,
        model,
        address,
        lastReading,
        lastReadingTime,
        units,
      };
    }
    return cleanObject;
  }

  async initializeOrRegenerateAsync(): Promise<void> {
    await this.#addUnreconizedDS18B20sToSDBAsync();
    const sensorsFromDatabase = await this.#sprootDB.getSensorsAsync();
    for (const sensor of sensorsFromDatabase) {
      const key = Object.keys(this.#sensors).find((key) => key === sensor.id.toString());
      if (key) {
        //Update if it exists
        this.#sensors[key]!.description = sensor.description;
      } else {
        //Create if it doesn't
        try {
          this.#logger.info(`Creating sensor ${sensor.model} ${sensor.id}`);
          await this.#createSensorAsync(sensor);
        } catch (err) {
          this.#logger.error(`Could not build sensor ${sensor.model} ${sensor.id}}`);
          this.#logger.error(err);
        }
      }
    }

    //Delete ones that don't exist
    const sensorIdsFromDatabase = sensorsFromDatabase.map((sensor) => sensor.id.toString());
    for (const key in this.#sensors) {
      if (!sensorIdsFromDatabase.includes(key)) {
        this.#logger.info(`Deleting sensor ${this.#sensors[key]!.model} ${this.#sensors[key]!.id}`);
        this.#disposeSensorAsync(this.#sensors[key]!);
        delete this.#sensors[key];
      }
    }
  }

  addReadingsToDatabaseAsync = async () =>
    this.#touchAllSensorsAsync(async (sensor) => await sensor.addLastReadingToDatabaseAsync());
  disposeAsync = async () =>
    this.#touchAllSensorsAsync(async (sensor) => await this.#disposeSensorAsync(sensor));
  getReadingsAsync = async () =>
    this.#touchAllSensorsAsync(async (sensor) => await sensor.getReadingAsync());

  async #touchAllSensorsAsync(fn: (arg0: SensorBase) => Promise<void>): Promise<void> {
    const promises = [];
    for (const key in this.#sensors) {
      promises.push(fn(this.#sensors[key] as SensorBase));
    }
    try {
      await Promise.allSettled(promises);
    } catch (err) {
      this.#logger.error(err);
    }
  }

  async #createSensorAsync(sensor: SDBSensor): Promise<void> {
    let newSensor: SensorBase | null = null;
    switch (sensor.model.toLowerCase()) {
      case "bme280":
        if (!sensor.address) {
          throw new BuildSensorError(
            "BME280 sensor address cannot be null! Sensor could not be added.",
          );
        }
        newSensor = await new BME280(sensor, this.#sprootDB, this.#logger).initAsync();
        if (newSensor) {
          this.#sensors[sensor.id] = newSensor;
        }
        break;

      case "ds18b20":
        if (!sensor.address) {
          throw new BuildSensorError(
            "DS18B20 sensor address cannot be null! Sensor could not be added.",
          );
        }
        newSensor = await new DS18B20(sensor, this.#sprootDB, this.#logger).initAsync();
        if (newSensor) {
          this.#sensors[sensor.id] = newSensor;
        }
        break;

      default:
        throw new BuildSensorError(`Unrecognized sensor model: ${sensor.model}`);
    }
  }

  async #addUnreconizedDS18B20sToSDBAsync() {
    const deviceAddresses = await DS18B20.getAddressesAsync(this.#logger);
    const sensorsFromDatabase = await this.#sprootDB.getDS18B20AddressesAsync();
    const promises: Promise<void>[] = [];
    for (const address of deviceAddresses) {
      if (sensorsFromDatabase.some((s) => s.address === address)) {
        continue;
      } else {
        this.#logger.info(`Adding unreconized DS18B20 sensor ${address} to database.`);
        promises.push(
          this.#sprootDB.addSensorAsync({
            description: null,
            model: "DS18B20",
            address: address,
          } as SDBSensor),
        );
      }
    }
    await Promise.all(promises);
  }

  async #disposeSensorAsync(sensor: SensorBase | DisposableSensorBase) {
    if (sensor instanceof DisposableSensorBase) {
      await sensor.disposeAsync();
    }
    delete this.#sensors[sensor.id];
  }
}

class BuildSensorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildSensorError";
  }
}

export { SensorList };
