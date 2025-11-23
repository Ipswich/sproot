import { BME280 } from "../BME280.js";
import { ESP32_BME280 } from "../ESP32_BME280.js";
import { DS18B20 } from "../DS18B20.js";
import { ESP32_DS18B20 } from "../ESP32_DS18B20.js";
import { ADS1115 } from "../ADS1115.js";
import { ESP32_ADS1115 } from "../ESP32_ADS1115.js";
import { CapacitiveMoistureSensor } from "../CapacitiveMoistureSensor.js";
import { ESP32_CapacitiveMoistureSensor } from "../ESP32_CapacitiveMoistureSensor.js";
import { ISensorBase } from "@sproot/sproot-common/dist/sensors/ISensorBase.js";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor.js";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB.js";
import { ChartData, DataSeries, DefaultColors } from "@sproot/sproot-common/dist/utility/ChartData.js";
import { SensorBase } from "../base/SensorBase.js";
import { SensorListChartData } from "./SensorListChartData.js";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType.js";
import { Models } from "@sproot/sproot-common/dist/sensors/Models.js";
import { MdnsService } from "../../system/MdnsService.js";
import { SDBSubcontroller } from "@sproot/sproot-common/dist/database/SDBSubcontroller.js";
import winston from "winston";

class SensorList {
  #sprootDB: ISprootDB;
  #mdnsService: MdnsService;
  #sensors: Record<string, SensorBase> = {};
  #logger: winston.Logger;
  #maxCacheSize: number;
  #initialCacheLookback: number;
  #maxChartDataSize: number;
  #chartDataPointInterval: number;
  #chartData: SensorListChartData;
  #isUpdating: boolean = false;
  #ds18b20UpdateSetInterval: NodeJS.Timeout | null = null;

  constructor(
    sprootDB: ISprootDB,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    this.#sprootDB = sprootDB;
    this.#mdnsService = mdnsService;
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
      const {
        id,
        name,
        model,
        subcontrollerId,
        address,
        color,
        lastReading,
        lastReadingTime,
        units,
        pin,
        lowCalibrationPoint,
        highCalibrationPoint,
      } = this.#sensors[key] as ISensorBase;
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
        subcontrollerId: subcontrollerId ?? null,
        address,
        color,
        lastReading,
        lastReadingTime,
        units,
        pin: pin ?? null,
        lowCalibrationPoint: lowCalibrationPoint ?? null,
        highCalibrationPoint: highCalibrationPoint ?? null,
      } as ISensorBase;
    }
    return cleanObject;
  }

  async initializeOrRegenerateAsync(): Promise<void> {
    if (!this.#ds18b20UpdateSetInterval) {
      await this.addUnreconizedDS18B20sToSDBAsync().catch((err) => {
        this.#logger.error(`Failed to add unrecognized DS18B20's to database. ${err}`);
      });
      this.#ds18b20UpdateSetInterval = setInterval(async () => {
        await this.addUnreconizedDS18B20sToSDBAsync().catch((err) => {
          this.#logger.error(`Failed to add unrecognized DS18B20's to database. ${err}`);
        });
      }, 5000);
    }

    if (this.#isUpdating) {
      this.#logger.warn(
        "SensorList is already updating, skipping initializeOrRegenerateAsync call.",
      );
      return;
    }
    this.#isUpdating = true;

    try {
      let sensorListChanges = false;
      const profiler = this.#logger.startTimer();
      const sensorsFromDatabase = await this.#sprootDB.getSensorsAsync();
      const subcontrollersFromDatabase = await this.#sprootDB.getSubcontrollersAsync();

      const promises = [];
      for (const sensor of sensorsFromDatabase) {
        let sensorChanges = false;
        const key = Object.keys(this.#sensors).find((key) => key === sensor.id.toString());
        //Update if it exists
        if (key && this.#sensors[key]) {
          // Check for Subcontroller changes
          if (this.#sensors[key]?.subcontrollerId != sensor.subcontrollerId) {
            sensorListChanges = true;
            this.#sensors[key]!.subcontrollerId = sensor.subcontrollerId;
          }

          if (
            this.#sensors[key] instanceof ESP32_BME280 ||
            this.#sensors[key] instanceof ESP32_DS18B20 ||
            this.#sensors[key] instanceof ESP32_ADS1115 ||
            this.#sensors[key] instanceof ESP32_CapacitiveMoistureSensor
          ) {
            const subcontroller = subcontrollersFromDatabase.find(
              (sub) => sub.id == sensor.subcontrollerId,
            );

            if (subcontroller != null) {
              if (
                this.#sensors[key]?.subcontroller!.name != subcontroller?.name ||
                this.#sensors[key]?.subcontroller!.hostName != subcontroller?.hostName
              ) {
                sensorListChanges = true;
                this.#sensors[key].subcontroller = subcontroller;
              }
            }
          }

          if (this.#sensors[key].name != sensor.name) {
            //Also updates chartSeries data (and chart data)
            this.#sensors[key].updateName(sensor.name);
            sensorChanges = true;
          }

          if (this.#sensors[key].color != sensor.color) {
            //Also updates chartSeries data (and chart data)
            this.#sensors[key].updateColor(sensor.color);
            sensorChanges = true;
          }

          if (this.#sensors[key].pin != sensor.pin) {
            this.#sensors[key].pin = sensor.pin;
            sensorChanges = true;
          }

          if (sensorChanges) {
            this.#logger.info(
              `Updating sensor {model: ${this.#sensors[key].model}, id: ${this.#sensors[key].id}}`,
            );
            sensorListChanges = true;
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
    } finally {
      this.#isUpdating = false;
    }
  }

  updateDataStoresAsync = async () => {
    await this.#touchAllSensorsAsync(async (sensor) => {
      sensor.updateDataStoresAsync();
    });

    if (ChartData.shouldUpdateByInterval(new Date(), this.#chartDataPointInterval)) {
      this.updateChartData();
    }
  };

  async [Symbol.asyncDispose]() {
    if (this.#ds18b20UpdateSetInterval) {
      clearInterval(this.#ds18b20UpdateSetInterval);
    }
    await this.#touchAllSensorsAsync(async (sensor) => this.#disposeSensorAsync(sensor));
  }

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
    let subcontroller: SDBSubcontroller | undefined;

    switch (sensor.model.toLowerCase()) {
      case Models.BME280.toLowerCase():
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

      case Models.ESP32_BME280.toLowerCase():
        if (!sensor.subcontrollerId) {
          throw new SensorListError("ESP32 BME280 external address cannot be null");
        }
        if (!sensor.address) {
          throw new SensorListError("ESP32 BME280 sensor address cannot be null");
        }
        subcontroller = (await this.#sprootDB.getSubcontrollersAsync()).find(
          (device) => device.id == sensor.subcontrollerId,
        );
        if (!subcontroller) {
          throw new SensorListError(
            `ESP32 BME280 references non-existent subcontrollerId ${sensor.subcontrollerId}.`,
          );
        }
        newSensor = await new ESP32_BME280(
          sensor,
          subcontroller,
          this.#sprootDB,
          this.#mdnsService,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#maxChartDataSize,
          this.#chartDataPointInterval,
          this.#logger,
        ).initAsync();
        break;

      case Models.DS18B20.toLowerCase():
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

      case Models.ESP32_DS18B20.toLowerCase():
        if (!sensor.subcontrollerId) {
          throw new SensorListError("ESP32 DS18B20 external address cannot be null");
        }
        if (!sensor.address) {
          throw new SensorListError("ESP32 DS18B20 sensor address cannot be null");
        }
        subcontroller = (await this.#sprootDB.getSubcontrollersAsync()).find(
          (device) => device.id == sensor.subcontrollerId,
        );
        if (!subcontroller) {
          throw new SensorListError(
            `ESP32 DS18B20 references non-existent subcontrollerId ${sensor.subcontrollerId}.`,
          );
        }
        newSensor = await new ESP32_DS18B20(
          sensor,
          subcontroller,
          this.#sprootDB,
          this.#mdnsService,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#maxChartDataSize,
          this.#chartDataPointInterval,
          this.#logger,
        ).initAsync();
        break;

      case Models.ADS1115.toLowerCase():
        if (!sensor.address) {
          throw new SensorListError("ADS1115 sensor address cannot be null");
        }
        if (!sensor.pin) {
          throw new SensorListError("ADS1115 sensor pin cannot be null");
        }
        newSensor = await new ADS1115(
          sensor,
          ReadingType.voltage,
          "1",
          this.#sprootDB,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#maxChartDataSize,
          this.#chartDataPointInterval,
          this.#logger,
        ).initAsync();
        break;

      case Models.ESP32_ADS1115.toLowerCase():
        if (!sensor.subcontrollerId) {
          throw new SensorListError("ESP32 ADS1115 external address cannot be null");
        }
        if (!sensor.address) {
          throw new SensorListError("ESP32 ADS1115 sensor address cannot be null");
        }
        if (!sensor.pin) {
          throw new SensorListError("ESP32 ADS1115 sensor pin cannot be null");
        }
        subcontroller = (await this.#sprootDB.getSubcontrollersAsync()).find(
          (device) => device.id == sensor.subcontrollerId,
        );
        if (!subcontroller) {
          throw new SensorListError(
            `ESP32 ADS1115 references non-existent subcontrollerId ${sensor.subcontrollerId}.`,
          );
        }
        newSensor = await new ESP32_ADS1115(
          sensor,
          subcontroller,
          ReadingType.voltage,
          "1",
          this.#sprootDB,
          this.#mdnsService,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#maxChartDataSize,
          this.#chartDataPointInterval,
          this.#logger,
        ).initAsync();
        break;

      case Models.CAPACITIVE_MOISTURE_SENSOR.toLowerCase():
        if (!sensor.address) {
          throw new SensorListError("Capacitive Moisture Sensor address cannot be null");
        }
        if (!sensor.pin) {
          throw new SensorListError("Capacitive Moisture Sensor pin cannot be null");
        }
        newSensor = await new CapacitiveMoistureSensor(
          sensor,
          this.#sprootDB,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#maxChartDataSize,
          this.#chartDataPointInterval,
          this.#logger,
        ).initAsync();
        break;

      case Models.ESP32_CAPACITIVE_MOISTURE_SENSOR.toLowerCase():
        if (!sensor.subcontrollerId) {
          throw new SensorListError(
            "ESP32 Capacitive Moisture Sensor external address cannot be null",
          );
        }
        if (!sensor.address) {
          throw new SensorListError("ESP32 Capacitive Moisture Sensor address cannot be null");
        }
        if (!sensor.pin) {
          throw new SensorListError("ESP32 Capacitive Moisture Sensor pin cannot be null");
        }
        subcontroller = (await this.#sprootDB.getSubcontrollersAsync()).find(
          (device) => device.id == sensor.subcontrollerId,
        );
        if (!subcontroller) {
          throw new SensorListError(
            `ESP32 Capacitive Moisture Sensor references non-existent subcontrollerId ${sensor.subcontrollerId}.`,
          );
        }
        newSensor = await new ESP32_CapacitiveMoistureSensor(
          sensor,
          subcontroller,
          this.#sprootDB,
          this.#mdnsService,
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

  async addUnreconizedDS18B20sToSDBAsync() {
    // Get all DS18B20 sensors from database
    const subcontrollers = await this.#sprootDB.getSubcontrollersAsync();
    const sensorsFromDatabase = await this.#sprootDB.getDS18B20AddressesAsync();
    const addToDatabasePromises: Promise<void>[] = [];

    // Get all DS18B20s from known ESP32 devices
    const remoteDeviceAddresses = [] as {
      subcontrollerId: number;
      hostName: string;
      deviceId: string;
    }[];
    await Promise.all(
      subcontrollers.map(async (subcontroller) => {
        const ipAddress = this.#mdnsService.getIPAddressByHostName(subcontroller.hostName);
        if (!ipAddress) {
          this.#logger.warn(
            `Could not find IP address for ESP32 DS18B20 device with hostName ${subcontroller.hostName}, skipping...`,
          );
          return;
        }
        const addresses = await ESP32_DS18B20.getAddressesAsync(ipAddress);
        addresses.map((address) => {
          remoteDeviceAddresses.push({
            subcontrollerId: subcontroller.id,
            hostName: subcontroller.hostName,
            deviceId: address,
          });
        });
      }),
    );

    // Filter remote devices
    for (const addresses of remoteDeviceAddresses) {
      if (
        sensorsFromDatabase.some(
          (s) => s.subcontrollerId == addresses.subcontrollerId && s.address === addresses.deviceId,
        )
      ) {
        continue;
      } else {
        this.#logger.info(
          `Adding unrecognized ESP32_DS18B20 sensor {subcontrollerId: ${addresses.subcontrollerId}, deviceId: ${addresses.deviceId} to database}`,
        );
        addToDatabasePromises.push(
          this.#sprootDB.addSensorAsync({
            name: `New ESP32_DS18B20 ..${addresses.deviceId.slice(-4)}`,
            model: Models.ESP32_DS18B20,
            address: addresses.deviceId,
            subcontrollerId: addresses.subcontrollerId,
            color: DefaultColors[Math.floor(Math.random() * DefaultColors.length)],
          } as SDBSensor),
        );
      }
    }

    // Get all DS18B20s from local device
    const localDeviceAddresses = await DS18B20.getAddressesAsync();

    // Filter local devices
    for (const address of localDeviceAddresses) {
      if (sensorsFromDatabase.some((s) => s.subcontrollerId == null && s.address === address)) {
        continue;
      } else {
        this.#logger.info(`Adding unrecognized DS18B20 sensor ${address} to database`);
        addToDatabasePromises.push(
          this.#sprootDB.addSensorAsync({
            name: `New DS18B20 ..${address.slice(-4)}`,
            model: Models.DS18B20,
            address: address,
            color: DefaultColors[Math.floor(Math.random() * DefaultColors.length)],
          } as SDBSensor),
        );
      }
    }

    const awaitedPromises = await Promise.allSettled(addToDatabasePromises);
    awaitedPromises.forEach((result) => {
      if (result.status === "rejected") {
        this.#logger.error(
          `Could not add unrecognized (ESP) DS18B20 sensor to database ${result.reason}`,
        );
      }
    });
  }

  async #disposeSensorAsync(sensor: SensorBase) {
    await this.#sensors[sensor.id]![Symbol.asyncDispose]();
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
