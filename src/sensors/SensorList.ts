
import { BME280 } from './BME280';

import { DisposableSensorBase, SensorBase } from '../types/SensorBase';
import { GDBSensor } from '../types/database-objects/GDBSensor';
import { GrowthDB } from '../GrowthDB';

class SensorList {
  #growthDB: GrowthDB;
  #sensors: SensorBase[] | DisposableSensorBase[] = [];

  constructor(growthDB: GrowthDB) {
    this.#growthDB = growthDB;
  }

  async initialize(): Promise<void> {
    const sensorsFromDatabase = await this.#growthDB.getSensors();
    const promises: Promise<void>[] = [];
    for (const sensor of sensorsFromDatabase) {
      promises.push(this.#buildSensor(sensor));
    }
    try {
      await Promise.all(promises);
    } catch (e) {
      if (e instanceof UnknownSensorError) {
        console.log(e.message);
      } else {
        throw e;
      }
    }
  }

  async regenerate(): Promise<void> {
    const sensorsFromDatabase = await this.#growthDB.getSensors();
    const promises: Promise<void>[] = [];
    for (const sensor of sensorsFromDatabase) {
      if (this.#sensors.some((s) => s.id === sensor.id)) {
        continue;
      }
      else {
        promises.push(this.#buildSensor(sensor));
      }
    }
    try {
      await Promise.all(promises);
    } catch (e) {
      if (e instanceof UnknownSensorError) {
        console.log(e.message);
      } else {
        throw e;
      }
    }
  }

  async dispose(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const sensor of this.#sensors) {
      if (sensor instanceof DisposableSensorBase) {
        promises.push(sensor.dispose());
      }
    }
    await Promise.all(promises);
  }

  async getReadings(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const sensor of this.#sensors) {
      promises.push(sensor.getReading())
    }
    await Promise.all(promises);
  }

  async addReadingsToDatabase(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const sensor of this.#sensors) {
      promises.push(sensor.addLastReadingToDatabase())
    }
    await Promise.all(promises);
  }

  async #buildSensor(sensor: GDBSensor): Promise<void> {
    switch (sensor.model.toLowerCase()){
      case "bme280":
        this.#sensors.push(await new BME280(sensor, this.#growthDB).init());
        break;
      default:
        throw new UnknownSensorError(`Unrecognized sensor model: ${sensor.model}`);
    }
  }
}

class UnknownSensorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownSensorError';
  }
}


export { SensorList };