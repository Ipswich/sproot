import { BME280 } from "./BME280";
import { DS18B20 } from "./DS18B20";
import { ISensorBase, SensorBase } from "@sproot/sproot-common/dist/sensors/SensorBase";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";

class SensorList {
  #sprootDB: ISprootDB;
  #sensors: Record<string, SensorBase> = {};
  #logger: winston.Logger;

  constructor(sprootDB: ISprootDB, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#logger = logger;
  }

  get sensors(): Record<string, SensorBase> {
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
    await this.#addUnreconizedDS18B20sToSDBAsync().catch((err) => {
      this.#logger.error(`Failed to add unrecognized DS18B20's to database. ${err}`);
    });

    const sensorsFromDatabase = await this.#sprootDB.getSensorsAsync();

    const promises = [];
    for (const sensor of sensorsFromDatabase) {
      const key = Object.keys(this.#sensors).find((key) => key === sensor.id.toString());
      if (key) {
        //Update if it exists
        this.#sensors[key]!.description = sensor.description;
      } else {
        //Create if it doesn't
        this.#logger.info(`Creating sensor {model: ${sensor.model}, id: ${sensor.id}}`);
        promises.push(
          this.#createSensorAsync(sensor).catch((err) =>
            this.#logger.error(
              `Could not build sensor {model: ${sensor.model}, id: ${sensor.id}}. ${err}`,
            ),
          ),
        );
      }
    }
    await Promise.allSettled(promises);

    //Delete ones that don't exist
    const sensorIdsFromDatabase = sensorsFromDatabase.map((sensor) => sensor.id.toString());
    for (const key in this.#sensors) {
      if (!sensorIdsFromDatabase.includes(key)) {
        try {
          this.#logger.info(
            `Deleting sensor {model: ${this.#sensors[key]?.model}, id: ${this.#sensors[key]?.id}}`,
          );
          this.#disposeSensorAsync(this.#sensors[key]!);
        } catch (err) {
          this.#logger.error(
            `Could not delete sensor {model: ${this.#sensors[key]?.model}, id: ${this.#sensors[key]?.id}}. ${err}`,
          );
        }
      }
    }
  }

  addReadingsToDatabaseAsync = async () =>
    await this.#touchAllSensorsAsync(async (sensor) => sensor.addLastReadingToDatabaseAsync());
  disposeAsync = async () =>
    await this.#touchAllSensorsAsync(async (sensor) => this.#disposeSensorAsync(sensor));

  async #touchAllSensorsAsync(fn: (arg0: SensorBase) => Promise<void>): Promise<void> {
    const promises = [];

    for (const key in this.#sensors) {
      promises.push(
        fn(this.#sensors[key] as SensorBase).catch((err) => {
          this.#logger.error(err);
        }),
      );
    }
    await Promise.allSettled(promises);
  }

  async #createSensorAsync(sensor: SDBSensor): Promise<void> {
    let newSensor: SensorBase | null = null;
    switch (sensor.model.toLowerCase()) {
      case "bme280":
        if (!sensor.address) {
          throw new SensorListError("BME280 sensor address cannot be null");
        }
        newSensor = await new BME280(sensor, this.#sprootDB, this.#logger).initAsync();
        if (newSensor) {
          this.#sensors[sensor.id] = newSensor;
        }
        break;

      case "ds18b20":
        if (!sensor.address) {
          throw new SensorListError("DS18B20 sensor address cannot be null");
        }
        newSensor = await new DS18B20(sensor, this.#sprootDB, this.#logger).initAsync();
        newSensor;
        if (newSensor) {
          this.#sensors[sensor.id] = newSensor;
        }
        break;

      default:
        throw new SensorListError(`Unrecognized sensor model ${sensor.model}`);
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
        this.#logger.info(`Adding unrecognized DS18B20 sensor ${address} to database`);
        promises.push(
          this.#sprootDB.addSensorAsync({
            description: null,
            model: "DS18B20",
            address: address,
          } as SDBSensor),
        );
      }
    }

    await Promise.allSettled(promises).then((results) => {
      results.forEach((result) => {
        if (result.status === "rejected") {
          this.#logger.error(
            `Could not add unrecognized DS18B20 sensor to database ${result.reason}`,
          );
        }
      });
    });
  }

  async #disposeSensorAsync(sensor: SensorBase) {
    await this.#sensors[sensor.id]!.disposeAsync();
    delete this.#sensors[sensor.id];
  }
}

class SensorListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildSensorError";
  }
}

export { SensorList };
