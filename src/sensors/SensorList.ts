import { BME280 } from './BME280';
import { DS18B20 } from './DS18B20';

import { DisposableSensorBase, SensorBase } from '../types/SensorBase';
import { GDBSensor } from '../types/database-objects/GDBSensor';
import { GrowthDB } from '../GrowthDB';

class SensorList {
  #growthDB: GrowthDB;
  #sensors: Record<string, (SensorBase | DisposableSensorBase)> = {};

  constructor(growthDB: GrowthDB) {
    this.#growthDB = growthDB;
  }

  async initialize(): Promise<void> {
    await this.#addUnreconizedDS18B20sToGDB();
    const sensorsFromDatabase = await this.#growthDB.getSensors();
    sensorsFromDatabase.forEach(async (sensor) => {
      try {
        await this.#buildSensor(sensor);
      } catch (e) {
        if (e instanceof UnknownSensorModelError || e instanceof MissingSensorIdError || e instanceof MissingSensorAddressError) {
          // console.log(e.message);
        } else {
          throw e;
        }
      }
    });
  }

  async regenerate(): Promise<void> {
    await this.#addUnreconizedDS18B20sToGDB();
    const sensorsFromDatabase = await this.#growthDB.getSensors();
    sensorsFromDatabase.forEach(async (sensor) => {
      const key = Object.keys(this.#sensors).find(key => key === sensor.id.toString());
      if (key) {
        this.#sensors[key]!.description = sensor.description;
      } else {
        try {
          await this.#buildSensor(sensor);        
        } catch (e) {
          if (e instanceof UnknownSensorModelError || e instanceof MissingSensorIdError || e instanceof MissingSensorAddressError) {
            // console.log(e.message);
          } else {
            throw e;
          }
        }
      }
    });
    const sensorIdsFromDatabase = sensorsFromDatabase.map((sensor) => sensor.id.toString());
    for (const key in this.#sensors) {
      if (!sensorIdsFromDatabase.includes(key)) {
        delete this.#sensors[key];
      }
    }
  }

  async dispose(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const key in this.#sensors) {
      if (this.#sensors[key] instanceof DisposableSensorBase) {
        promises.push((this.#sensors[key] as DisposableSensorBase).dispose());
      }
    }
    await Promise.all(promises);
  }

  async getReadings(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const key in this.#sensors) {
      if (this.#sensors[key] instanceof SensorBase) {
        promises.push((this.#sensors[key] as SensorBase).getReading());
      }
    }
    await Promise.all(promises);
  }
  
  async addReadingsToDatabase(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const key in this.#sensors) {
      if (this.#sensors[key] instanceof SensorBase) {
        promises.push((this.#sensors[key] as SensorBase).addLastReadingToDatabase());
      }
    }
    await Promise.all(promises);
  }

  async #buildSensor(sensor: GDBSensor): Promise<void> {
    if (!sensor.id){
      throw new MissingSensorIdError('Sensor ID cannot be 0/\'\'/undefined/null! Sensor could not be added.');
    }
    switch (sensor.model.toLowerCase()){
      case "bme280":
        if (!sensor.address) {
          throw new MissingSensorAddressError('BME280 sensor address cannot be null! Sensor could not be added.');
        }
        this.#sensors[sensor.id] = await new BME280(sensor, this.#growthDB).init();
        break;
      case "ds18b20":
        if (!sensor.address) {
          throw new MissingSensorAddressError('DS18B20 sensor address cannot be null! Sensor could not be added.');
        }
        this.#sensors[sensor.id] = new DS18B20(sensor, this.#growthDB);
        break;
      default:
        throw new UnknownSensorModelError(`Unrecognized sensor model: ${sensor.model}`);
    }
  }

  async #addUnreconizedDS18B20sToGDB(){
    const deviceAddresses = await DS18B20.getAddresses();
    const sensorsFromDatabase = await this.#growthDB.getDS1B20Addresses();
    const promises: Promise<void>[] = [];
    for (const address of deviceAddresses) {
      if (sensorsFromDatabase.some((s) => s.address === address)) {
        continue;
      }
      else {
        promises.push(this.#growthDB.addSensor({description: null, model: 'DS18B20', address: address} as GDBSensor));
      }
    }
    await Promise.all(promises);
  }
}

class UnknownSensorModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownSensorError';
  }
}

class MissingSensorAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingSensorAddressError';
  }
}

class MissingSensorIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingSensorIdError';
  }
}

export { SensorList };