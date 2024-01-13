import { BME280 } from "./BME280";
import { DS18B20 } from "./DS18B20";
import {
  ISensorBase,
  ReadingType,
  SensorBase,
} from "@sproot/sproot-common/dist/sensors/SensorBase";
import { ChartData } from "@sproot/sproot-common/dist/api/ChartData";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";

class SensorList {
  #sprootDB: ISprootDB;
  #sensors: Record<string, SensorBase> = {};
  #logger: winston.Logger;
  #chartData: Record<ReadingType, Array<ChartData>> = {
    temperature: [],
    humidity: [],
    pressure: [],
  };

  constructor(sprootDB: ISprootDB, logger: winston.Logger) {
    this.#sprootDB = sprootDB;
    this.#logger = logger;
  }

  get sensors(): Record<string, SensorBase> {
    return this.#sensors;
  }

  get chartData(): Record<ReadingType, Array<ChartData>> {
    return this.#chartData;
  }

  get sensorData(): Record<string, ISensorBase> {
    const cleanObject: Record<string, ISensorBase> = {};
    for (const key in this.#sensors) {
      const { id, name, model, address, lastReading, lastReadingTime, units } = this.#sensors[
        key
      ] as ISensorBase;
      cleanObject[key] = {
        id,
        name,
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
    let sensorListChanges = false;
    const profiler = this.#logger.startTimer();
    await this.#addUnreconizedDS18B20sToSDBAsync().catch((err) => {
      this.#logger.error(`Failed to add unrecognized DS18B20's to database. ${err}`);
    });
    const sensorsFromDatabase = await this.#sprootDB.getSensorsAsync();

    const promises = [];
    for (const sensor of sensorsFromDatabase) {
      const key = Object.keys(this.#sensors).find((key) => key === sensor.id.toString());
      if (key) {
        //Update if it exists
        this.#sensors[key]!.name = sensor.name;
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
        sensorListChanges = true;
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
          sensorListChanges = true;
        } catch (err) {
          this.#logger.error(
            `Could not delete sensor {model: ${this.#sensors[key]?.model}, id: ${this.#sensors[key]?.id}}. ${err}`,
          );
        }
      }
    }

    if (sensorListChanges) {
      this.loadChartDataFromCachedReadings();
    }
    profiler.done({
      message: "SensorList initializeOrRegenerate time",
      level: "debug",
    });
  }

  addReadingsToDatabaseAsync = async () => {
    await this.#touchAllSensorsAsync(async (sensor) => {
      sensor.addLastReadingToDatabaseAsync();
    });
    this.updateChartDataFromLastReading();
  };
  disposeAsync = async () =>
    await this.#touchAllSensorsAsync(async (sensor) => this.#disposeSensorAsync(sensor));
  loadChartDataFromCachedReadings() {
    //Format cached readings for recharts
    const chartObject = {} as Record<ReadingType, Record<string, ChartData>>;
    for (const key in this.#sensors) {
      const sensor = this.#sensors[key]!;
      for (const readingType in sensor.cachedReadings) {
        const cachedReadings = sensor.cachedReadings[readingType as ReadingType];
        for (const reading of cachedReadings) {
          if (!chartObject[readingType as ReadingType]) {
            chartObject[readingType as ReadingType] = {};
          }
          const logTime = this.#formatDateForChart(reading.logTime);
          if (!chartObject[readingType as ReadingType][logTime]) {
            chartObject[readingType as ReadingType][logTime] = {
              name: logTime,
            } as ChartData;
          }
          chartObject[readingType as ReadingType][logTime]![sensor.name] = Number(reading.data);
        }
      }
    }
    // Convert to array
    for (const readingType in chartObject) {
      this.#chartData[readingType as ReadingType] = Object.values(
        chartObject[readingType as ReadingType],
      );
    }

    //Remove extra readings
    for (const readingType in this.#chartData) {
      while (
        this.#chartData[readingType as ReadingType].length >
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!)
      ) {
        this.#chartData[readingType as ReadingType].shift();
      }
    }

    // Log changes
    let logMessage = "";
    for (const readingType in this.#chartData) {
      if (this.#chartData[readingType as ReadingType].length > 0) {
        logMessage += `{${readingType}: ${this.#chartData[readingType as ReadingType].length}} `;
      }
    }
    this.#logger.info(`Loaded chart data. ${logMessage}`);
  }

  updateChartDataFromLastReading() {
    const lastReadingObject = {} as Record<ReadingType, ChartData>;
    for (const sensor of Object.values(this.#sensors)) {
      for (const readingType in sensor.lastReading) {
        const formattedTime = this.#formatDateForChart(sensor.lastReadingTime!);
        if (!lastReadingObject[readingType as ReadingType]) {
          lastReadingObject[readingType as ReadingType] = {
            name: formattedTime,
          } as ChartData;
        }
        lastReadingObject[readingType as ReadingType][sensor.name] = Number(
          sensor.lastReading[readingType as ReadingType],
        );
      }
    }
    // Add new readings
    for (const readingType in lastReadingObject) {
      this.#chartData[readingType as ReadingType].push(
        lastReadingObject[readingType as ReadingType],
      );
    }

    //Remove old readings
    for (const readingType in this.#chartData) {
      while (
        this.#chartData[readingType as ReadingType].length >
        Number(process.env["MAX_SENSOR_READING_CACHE_SIZE"]!)
      ) {
        this.#chartData[readingType as ReadingType].shift();
      }
    }

    // Log changes
    let logMessage = "";
    for (const readingType in this.#chartData) {
      if (this.#chartData[readingType as ReadingType].length > 0) {
        logMessage += `{${readingType}: ${this.#chartData[readingType as ReadingType].length}} `;
      }
    }
    this.#logger.info(`Updated chart data. Data counts: ${logMessage}`);
  }

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
            name: `New DS18B20 ${address}`,
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

  #formatDateForChart(date: Date | string): string {
    if (typeof date === "string") {
      date = new Date(date);
    }
    date = date as Date;

    let hours = date.getHours();
    const amOrPm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${month}/${day} ${hours}:${minutes} ${amOrPm}`;
  }
}

class SensorListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SensorListError";
  }
}

export { SensorList };
