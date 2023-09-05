import { BME280 } from './BME280';
import { DS18B20 } from './DS18B20';

import { DisposableSensorBase, SensorBase } from '../types/SensorBase';
import { GDBSensor } from '../types/database-objects/GDBSensor';
import { GrowthDB } from '../GrowthDB';

class SensorList {
  #growthDB: GrowthDB;
  #sensors: (SensorBase | DisposableSensorBase)[] = [];

  constructor(growthDB: GrowthDB) {
    this.#growthDB = growthDB;
  }

  async initialize(): Promise<void> {
    await this.#addUnreconizedDS18B20sToGDB();
    const sensorsFromDatabase = await this.#growthDB.getSensors();
    for (const sensor of sensorsFromDatabase) {
      try {
        await this.#buildSensor(sensor);
      } catch (e) {
        if (e instanceof UnknownSensorModelError || e instanceof MissingSensorAddressError) {
          console.log(e.message);
        } else {
          throw e;
        }
      }
    }
  }

  async regenerate(): Promise<void> {
    await this.#addUnreconizedDS18B20sToGDB();
    const sensorsFromDatabase = await this.#growthDB.getSensors();
    for (const sensor of sensorsFromDatabase) {
      if (this.#sensors.some((s) => s.id === sensor.id)) {
        continue;
      } else {
        try {
          this.#buildSensor(sensor);        
        } catch (e) {
          if (e instanceof UnknownSensorModelError || e instanceof MissingSensorAddressError) {
            console.log(e.message);
          } else {
            throw e;
          }
        }
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
        if (!sensor.address) {
          throw new MissingSensorAddressError('BME280 sensor address cannot be null! Sensor failed to be added.');
        }
        this.#sensors.push(await new BME280(sensor, this.#growthDB).init());
        break;
      case "ds18b20":
        if (!sensor.address) {
          throw new MissingSensorAddressError('DS18B20 sensor address cannot be null! Sensor failed to be added.');
        }
        this.#sensors.push(new DS18B20(sensor, this.#growthDB));
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

export { SensorList };