import { BME280 } from './BME280';
import { DS18B20 } from './DS18B20';
import { DisposableSensorBase, SensorBase } from '../types/SensorBase';
import { GDBSensor } from '../types/database-objects/GDBSensor';
import { IGrowthDB } from '../types/database-objects/IGrowthDB';

class SensorList {
  #growthDB: IGrowthDB;
  #sensors: Record<string, (SensorBase | DisposableSensorBase)> = {};

  constructor(growthDB: IGrowthDB) {
    this.#growthDB = growthDB;
  }

  get sensors(): Record<string, (SensorBase | DisposableSensorBase)> {
    return this.#sensors;
  }

  async initializeOrRegenerate(): Promise<void> {
    if (process.env['AUTO_ADD_DS18B20'] === 'true'){
      await this.#addUnreconizedDS18B20sToGDBAsync();
    }
    const sensorsFromDatabase = await this.#growthDB.getSensors();
    sensorsFromDatabase.forEach(async (sensor) => {
      const key = Object.keys(this.#sensors).find(key => key === sensor.id.toString());
      if (key) {
        //Update if it exists
        this.#sensors[key]!.description = sensor.description;
      } else {
        try {
          //Create if it doesn't
          await this.#buildSensorAsync(sensor);        
        } catch (e) {
          if (e instanceof UnknownSensorModelError || e instanceof MissingSensorIdError || e instanceof MissingSensorAddressError) {
            // console.error(e.message);
          } else {
            throw e;
          }
        }
      }
    });
    //Delete ones that don't exist
    const sensorIdsFromDatabase = sensorsFromDatabase.map((sensor) => sensor.id.toString());
    for (const key in this.#sensors) {
      if (!sensorIdsFromDatabase.includes(key)) {
        delete this.#sensors[key];
      }
    }
  }

  disposeAsync = async () => this.#touchAllSensorsAsync(async (sensor) => sensor instanceof DisposableSensorBase ? await sensor.disposeAsync() : Promise.resolve());
  getReadingsAsync = async () => this.#touchAllSensorsAsync(async (sensor) => await sensor.getReadingAsync());
  addReadingsToDatabaseAsync = async () => this.#touchAllSensorsAsync(async (sensor) => await sensor.addLastReadingToDatabaseAsync());

  async #touchAllSensorsAsync(fn: (arg0: SensorBase) => Promise<void>): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const key in this.#sensors) {
      if (this.#sensors[key] instanceof SensorBase) {
        promises.push(fn(this.#sensors[key] as SensorBase));
      }
    }
    try {
      await Promise.all(promises);
    } catch (e) {
      console.error(e);
    }
  }

  async #buildSensorAsync(sensor: GDBSensor): Promise<void> {
    if (!sensor.id){
      throw new MissingSensorIdError('Sensor ID cannot be 0/\'\'/undefined/null! Sensor could not be added.');
    }
    switch (sensor.model.toLowerCase()){
      case "bme280":
        if (!sensor.address) {
          throw new MissingSensorAddressError('BME280 sensor address cannot be null! Sensor could not be added.');
        }
        this.#sensors[sensor.id] = await new BME280(sensor, this.#growthDB).initAsync();
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

  async #addUnreconizedDS18B20sToGDBAsync() {
    const deviceAddresses = await DS18B20.getAddressesAsync();
    const sensorsFromDatabase = await this.#growthDB.getDS18B20Addresses();
    const promises: Promise<void>[] = [];
    for (const address of deviceAddresses) {
      if (sensorsFromDatabase.some((s) => s.address === address)) {
        continue;
      }
      else {
        promises.push(this.#growthDB.addSensor({description: null, model: 'DS18B20', address: address} as GDBSensor));
      }
    }
    try {
      await Promise.all(promises);
    }
    catch (e) {
      console.error(e);
    }
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