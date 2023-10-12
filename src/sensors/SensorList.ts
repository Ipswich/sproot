import { BME280 } from "./BME280";
import { DS18B20 } from "./DS18B20";
import {
  DisposableSensorBase,
  ISensorBase,
  SensorBase,
} from "./types/SensorBase";
import { SDBSensor } from "../database/types/SDBSensor";
import { ISprootDB } from "../database/types/ISprootDB";

class SensorList {
  #sprootDB: ISprootDB;
  #sensors: Record<string, SensorBase | DisposableSensorBase> = {};

  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  get sensors(): Record<string, SensorBase | DisposableSensorBase> {
    return this.#sensors;
  }

  get sensorData(): Record<string, ISensorBase> {
    const cleanObject: Record<string, ISensorBase> = {};
    for (const key in this.#sensors) {
      const {
        id,
        description,
        model,
        address,
        lastReading,
        lastReadingTime,
        units,
      } = this.#sensors[key] as ISensorBase;
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
      const key = Object.keys(this.#sensors).find(
        (key) => key === sensor.id.toString(),
      );
      if (key) {
        //Update if it exists
        this.#sensors[key]!.description = sensor.description;
      } else {
        //Create if it doesn't
        await this.#buildSensorAsync(sensor);
      }
    }

    //Delete ones that don't exist
    const sensorIdsFromDatabase = sensorsFromDatabase.map((sensor) =>
      sensor.id.toString(),
    );
    for (const key in this.#sensors) {
      if (!sensorIdsFromDatabase.includes(key)) {
        delete this.#sensors[key];
      }
    }
  }

  addReadingsToDatabaseAsync = async () =>
    this.#touchAllSensorsAsync(
      async (sensor) => await sensor.addLastReadingToDatabaseAsync(),
    );
  disposeAsync = async () =>
    this.#touchAllSensorsAsync(
      async (sensor) => await this.#disposeSensorAsync(sensor),
    );
  getReadingsAsync = async () =>
    this.#touchAllSensorsAsync(
      async (sensor) => await sensor.getReadingAsync(),
    );

  async #touchAllSensorsAsync(
    fn: (arg0: SensorBase) => Promise<void>,
  ): Promise<void> {
    for (const key in this.#sensors) {
      try {
        await fn(this.#sensors[key] as SensorBase);
      } catch (err) {
        console.error(err);
      }
    }
  }

  async #buildSensorAsync(sensor: SDBSensor): Promise<void> {
    switch (sensor.model.toLowerCase()) {
      case "bme280":
        if (!sensor.address) {
          throw new BuildSensorError(
            "BME280 sensor address cannot be null! Sensor could not be added.",
          );
        }
        this.#sensors[sensor.id] = await new BME280(
          sensor,
          this.#sprootDB,
        ).initAsync();
        break;

      case "ds18b20":
        if (!sensor.address) {
          throw new BuildSensorError(
            "DS18B20 sensor address cannot be null! Sensor could not be added.",
          );
        }
        this.#sensors[sensor.id] = new DS18B20(sensor, this.#sprootDB);
        break;

      default:
        throw new BuildSensorError(
          `Unrecognized sensor model: ${sensor.model}`,
        );
    }
  }

  async #addUnreconizedDS18B20sToSDBAsync() {
    const deviceAddresses = await DS18B20.getAddressesAsync();
    const sensorsFromDatabase = await this.#sprootDB.getDS18B20AddressesAsync();
    const promises: Promise<void>[] = [];
    for (const address of deviceAddresses) {
      if (sensorsFromDatabase.some((s) => s.address === address)) {
        continue;
      } else {
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
