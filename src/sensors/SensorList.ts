import { BME280 } from './BME280';
import { DS18B20 } from './DS18B20';
import { DisposableSensorBase, SensorBase } from './types/SensorBase';
import { GDBSensor } from '../database/types/GDBSensor';
import { IGrowthDB } from '../database/types/IGrowthDB';

class SensorList {
  #growthDB: IGrowthDB;
  #sensors: Record<string, (SensorBase | DisposableSensorBase)> = {};

  constructor(growthDB: IGrowthDB) {
    this.#growthDB = growthDB;
  }

  get sensors(): Record<string, (SensorBase | DisposableSensorBase)> {
    let res: Record<string, (SensorBase | DisposableSensorBase)> = {} 
    for (const key in this.#sensors) {
      const cleanObject = JSON.parse(JSON.stringify(this.#sensors[key]));
      cleanObject["lastReadingTime"] = new Date(cleanObject["lastReadingTime"]).toUTCString();
      delete cleanObject["growthDB"];
      res[cleanObject.id] = cleanObject as (SensorBase | DisposableSensorBase);
    }
    return res;
  }

  async initializeOrRegenerateAsync(): Promise<void> {
    await this.#addUnreconizedDS18B20sToGDBAsync();
    const sensorsFromDatabase = await this.#growthDB.getSensorsAsync();
    for (const sensor of sensorsFromDatabase) {
      const key = Object.keys(this.#sensors).find(key => key === sensor.id.toString());
      if (key) {
        //Update if it exists
        this.#sensors[key]!.description = sensor.description;
      } else {
        //Create if it doesn't
        await this.#buildSensorAsync(sensor);
      }
    };
    //Delete ones that don't exist
    const sensorIdsFromDatabase = sensorsFromDatabase.map((sensor) => sensor.id.toString());
    for (const key in this.#sensors) {
      if (!sensorIdsFromDatabase.includes(key)) {
        delete this.#sensors[key];
      }
    }
  }

  addReadingsToDatabaseAsync = async () => this.#touchAllSensorsAsync(async (sensor) => await sensor.addLastReadingToDatabaseAsync());
  disposeAsync = async () => this.#touchAllSensorsAsync(async (sensor) => await this.#disposeSensorAsync(sensor));
  getReadingsAsync = async () => this.#touchAllSensorsAsync(async (sensor) => await sensor.getReadingAsync());


  async #touchAllSensorsAsync(fn: (arg0: SensorBase) => Promise<void>): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const key in this.#sensors) {
      promises.push(fn(this.#sensors[key] as SensorBase));      
    }
    await Promise.all(promises);
  }

  async #buildSensorAsync(sensor: GDBSensor): Promise<void> {
    switch (sensor.model.toLowerCase()){
      case "bme280":
        if (!sensor.address) {
          throw new BuildSensorError('BME280 sensor address cannot be null! Sensor could not be added.');
        }
        this.#sensors[sensor.id] = await new BME280(sensor, this.#growthDB).initAsync();
        break;

      case "ds18b20":
        if (!sensor.address) {
          throw new BuildSensorError('DS18B20 sensor address cannot be null! Sensor could not be added.');
        }
        this.#sensors[sensor.id] = new DS18B20(sensor, this.#growthDB);
        break;

      default:
        throw new BuildSensorError(`Unrecognized sensor model: ${sensor.model}`);
    }
  }

  async #addUnreconizedDS18B20sToGDBAsync() {
    const deviceAddresses = await DS18B20.getAddressesAsync();
    const sensorsFromDatabase = await this.#growthDB.getDS18B20AddressesAsync();
    const promises: Promise<void>[] = [];
    for (const address of deviceAddresses) {
      if (sensorsFromDatabase.some((s) => s.address === address)) {
        continue;
      }
      else {
        promises.push(this.#growthDB.addSensorAsync({description: null, model: 'DS18B20', address: address} as GDBSensor));
      }
    }
    await Promise.all(promises);
  }

  async #disposeSensorAsync(sensor: SensorBase | DisposableSensorBase){
    if (sensor instanceof DisposableSensorBase) {
      await sensor.disposeAsync();
    }
    delete this.#sensors[sensor.id];
  }
}

class BuildSensorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildSensorError';
  }
}

export { SensorList };