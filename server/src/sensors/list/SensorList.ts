import { BME280 } from "../BME280";
import { DS18B20 } from "../DS18B20";
import { ISensorBase } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ChartData, DataSeries } from "@sproot/sproot-common/dist/utility/ChartData";
import { SensorBase } from "../base/SensorBase";
import winston from "winston";
import { SensorListChartData } from "./SensorListChartData";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";

class SensorList {
  #sprootDB: ISprootDB;
  #sensors: Record<string, SensorBase> = {};
  #logger: winston.Logger;
  #maxCacheSize: number;
  #initialCacheLookback: number;
  #maxChartDataSize: number;
  #chartDataPointInterval: number;
  #chartData: SensorListChartData;

  constructor(
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    this.#sprootDB = sprootDB;
    this.#maxCacheSize = maxCacheSize;
    this.#initialCacheLookback = initialCacheLookback;
    this.#maxChartDataSize = maxChartDataSize;
    this.#chartDataPointInterval = chartDataPointInterval;
    this.#logger = logger;
    this.#chartData = new SensorListChartData(maxChartDataSize, chartDataPointInterval);
  }

  get chartData(): SensorListChartData {
    return this.#chartData;
  }

  get sensors(): Record<string, SensorBase> {
    return this.#sensors;
  }

  get sensorData(): Record<string, ISensorBase> {
    const cleanObject: Record<string, ISensorBase> = {};
    for (const key in this.#sensors) {
      const { id, name, model, address, color, lastReading, lastReadingTime, units } = this
        .#sensors[key] as ISensorBase;
      for (const readingType in lastReading) {
        const reading = lastReading[readingType as ReadingType];
        if (reading !== undefined) {
          lastReading[readingType as ReadingType] = this.#formatReadingForDisplay(reading);
        }
      }
      cleanObject[key] = {
        id,
        name,
        model,
        address,
        color,
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
        if (this.#sensors[key]!.name !== sensor.name) {
          //Also updates chartSeries data
          this.#sensors[key]!.updateName(sensor.name);
          sensorListChanges = true;
        }

        if (this.#sensors[key]?.color != sensor.color) {
          //Also updates chartSeries data
          this.#sensors[key]!.updateColor(sensor.color);
          sensorListChanges = true;
        }

        if (sensorListChanges) {
          this.#logger.info(
            `Updating sensor {model: ${this.#sensors[key]?.model}, id: ${this.#sensors[key]?.id}}`,
          );
        }
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

    //Remove deleted ones
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
      this.loadChartData();
      this.loadChartSeries();
    }
    profiler.done({
      message: "SensorList initializeOrRegenerate time",
      level: "debug",
    });
  }

  updateDataStoresAsync = async () => {
    await this.#touchAllSensorsAsync(async (sensor) => {
      sensor.updateDataStoresAsync();
    });

    if (ChartData.shouldUpdateByInterval(new Date(), this.#chartDataPointInterval)) {
      this.updateChartData();
    }
  };

  disposeAsync = async () =>
    await this.#touchAllSensorsAsync(async (sensor) => this.#disposeSensorAsync(sensor));

  loadChartData() {
    //Format cached readings for recharts
    const profiler = this.#logger.startTimer();

    for (const readingType in ReadingType) {
      const dataSeriesMap = Object.keys(this.#sensors)
        .map((key) => {
          return this.#sensors[key]?.getChartData().data[readingType as ReadingType];
        })
        .filter((x) => x != undefined) as DataSeries[];
      this.#chartData.loadChartData(dataSeriesMap, "", readingType as ReadingType);
    }

    // Log changes
    let logMessage = "";
    const chartData = this.#chartData.get().data;
    for (const readingType of Object.keys(chartData)) {
      if (chartData[readingType as ReadingType].length > 0) {
        logMessage += `{${readingType}: ${chartData[readingType as ReadingType].length}} `;
      }
    }
    this.#logger.info(`Loaded sensor chart data. ${logMessage}`);
    profiler.done({
      message: "SensorList loadChartDataFromCachedReadings time",
      level: "debug",
    });
  }

  loadChartSeries() {
    const series = Object.values(this.#sensors).map((sensor) => sensor.getChartData().series);
    this.#chartData.loadChartSeries(series);
  }

  updateChartData() {
    const profiler = this.#logger.startTimer();
    for (const readingType in ReadingType) {
      const dataSeriesMap = Object.keys(this.#sensors)
        .map((key) => {
          return this.#sensors[key]?.getChartData().data[readingType as ReadingType];
        })
        .filter((dataSeries) => dataSeries != undefined) as DataSeries[];

      this.#chartData.updateChartData(dataSeriesMap, "", readingType as ReadingType);
    }

    // Log changes
    let logMessage = "";
    const chartData = this.#chartData.get().data;
    for (const readingType of Object.keys(chartData)) {
      if (chartData[readingType as ReadingType].length > 0) {
        logMessage += `{${readingType}: ${chartData[readingType as ReadingType].length}} `;
      }
    }
    this.#logger.info(`Updated sensor list chart data. Data counts: ${logMessage}`);
    profiler.done({
      message: "SensorList updateChartData time",
      level: "debug",
    });
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
        newSensor = await new BME280(
          sensor,
          this.#sprootDB,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#maxChartDataSize,
          this.#chartDataPointInterval,
          this.#logger,
        ).initAsync();
        break;

      case "ds18b20":
        if (!sensor.address) {
          throw new SensorListError("DS18B20 sensor address cannot be null");
        }
        newSensor = await new DS18B20(
          sensor,
          this.#sprootDB,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#maxChartDataSize,
          this.#chartDataPointInterval,
          this.#logger,
        ).initAsync();
        break;
      default:
        throw new SensorListError(`Unrecognized sensor model ${sensor.model}`);
    }
    if (newSensor) {
      this.#sensors[sensor.id] = newSensor;
    }
  }

  async #addUnreconizedDS18B20sToSDBAsync() {
    // filter noise addresses (anything prefixed with "00")
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
            name: `New DS18B20 ..${address.slice(-4)}`,
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

  #formatReadingForDisplay(data: string): string {
    return parseFloat(data).toFixed(3);
  }
}

class SensorListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SensorListError";
  }
}

export { SensorList };
