import { BME280 } from "../BME280";
import { ESP32_BME280 } from "../ESP32_BME280";
import { DS18B20 } from "../DS18B20";
import { ESP32_DS18B20 } from "../ESP32_DS18B20";
import { ADS1115 } from "../ADS1115";
import { ESP32_ADS1115 } from "../ESP32_ADS1115";
import { CapacitiveMoistureSensor } from "../CapacitiveMoistureSensor";
import { ESP32_CapacitiveMoistureSensor } from "../ESP32_CapacitiveMoistureSensor";
import { ISensorBase } from "@sproot/common/sensors/ISensorBase";
import { SDBSensor } from "@sproot/common/database/SDBSensor";
import { ISensorsRepository } from "../../database/repositories/sensors/ISensorsRepository";
import { ISubcontrollersRepository } from "../../database/repositories/subcontrollers/ISubcontrollersRepository";
import { SensorBase } from "../base/SensorBase";
import winston from "winston";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { Models } from "@sproot/common/sensors/Models";
import { MdnsService } from "../../system/MdnsService";
import { SDBSubcontroller } from "@sproot/common/database/SDBSubcontroller";
import { IEventBus } from "../../eventbus/IEventBus";
import { Events } from "../../eventbus/events/Events";
import { SensorModifiedEvent } from "../../eventbus/events/sensors/SensorModifiedEvent";
import { AvailableDevice } from "@sproot/common/outputs/AvailableDevice";

const BME280_ADDRESSES = ["0x76", "0x77"];
const ADS1115_ADDRESSES = ["0x48", "0x49", "0x4A", "0x4B"];
const ADS1115_PINS = ["0", "1", "2", "3"];

class SensorList {
  #eventBus: IEventBus;
  #sensorsRepository: ISensorsRepository;
  #subcontrollersRepository: ISubcontrollersRepository;
  #mdnsService: MdnsService;
  #sensors: Record<string, SensorBase> = {};
  #logger: winston.Logger;
  #maxCacheSize: number;
  #initialCacheLookback: number;
  #cacheBucketMinutes: number;
  #isUpdating: boolean = false;
  #listenerCleanupFunction: () => void;

  static createInstanceAsync(
    eventBus: IEventBus,
    sensorsRepository: ISensorsRepository,
    subcontrollersRepository: ISubcontrollersRepository,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ): Promise<SensorList> {
    const sensorList = new SensorList(
      eventBus,
      sensorsRepository,
      subcontrollersRepository,
      mdnsService,
      maxCacheSize,
      initialCacheLookback,
      cacheBucketMinutes,
      logger,
    );
    return sensorList.regenerateAsync();
  }

  private constructor(
    eventBus: IEventBus,
    sensorsRepository: ISensorsRepository,
    subcontrollersRepository: ISubcontrollersRepository,
    mdnsService: MdnsService,
    maxCacheSize: number,
    initialCacheLookback: number,
    cacheBucketMinutes: number,
    logger: winston.Logger,
  ) {
    this.#eventBus = eventBus;
    this.#sensorsRepository = sensorsRepository;
    this.#subcontrollersRepository = subcontrollersRepository;
    this.#mdnsService = mdnsService;
    this.#maxCacheSize = maxCacheSize;
    this.#initialCacheLookback = initialCacheLookback;
    this.#cacheBucketMinutes = cacheBucketMinutes;
    this.#logger = logger;

    const sensorModifiedListener = async (_event: SensorModifiedEvent) => {
      await this.regenerateAsync();
    };

    const sensorModifiedUnsubscribe = this.#eventBus.subscribe(
      Events.SENSOR_MODIFIED_EVENT,
      sensorModifiedListener,
    );

    this.#listenerCleanupFunction = () => {
      sensorModifiedUnsubscribe();
    };
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
        deviceZoneId: deviceZoneId,
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
        deviceZoneId: deviceZoneId ?? null,
        lowCalibrationPoint: lowCalibrationPoint ?? null,
        highCalibrationPoint: highCalibrationPoint ?? null,
      } as ISensorBase;
    }
    return cleanObject;
  }

  async regenerateAsync(): Promise<this> {
    if (this.#isUpdating) {
      this.#logger.warn("SensorList is already updating, skipping regenerateAsync call.");
      return this;
    }
    this.#isUpdating = true;

    try {
      const profiler = this.#logger.startTimer();
      const sensorsFromDatabase = await this.#sensorsRepository.getAllAsync();
      const subcontrollersFromDatabase = await this.#subcontrollersRepository.getAllAsync();

      const promises = [];
      for (const sensor of sensorsFromDatabase) {
        let sensorChanges = false;
        const key = Object.keys(this.#sensors).find((key) => key === sensor.id.toString());
        //Update if it exists
        if (key && this.#sensors[key]) {
          // Check for Subcontroller changes
          if (this.#sensors[key]?.subcontrollerId != sensor.subcontrollerId) {
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
                this.#sensors[key].subcontroller = subcontroller;
              }
            }
          }

          if (this.#sensors[key].name != sensor.name) {
            // Also updates name in cache
            this.#sensors[key].updateName(sensor.name);
            sensorChanges = true;
          }

          if (this.#sensors[key].color != sensor.color) {
            // Also updates color in cache
            this.#sensors[key].updateColor(sensor.color);
            sensorChanges = true;
          }

          if (this.#sensors[key].pin != sensor.pin) {
            this.#sensors[key].pin = sensor.pin;
            sensorChanges = true;
          }

          if (this.#sensors[key].deviceZoneId != sensor.deviceZoneId) {
            this.#sensors[key].deviceZoneId = sensor.deviceZoneId;
            sensorChanges = true;
          }

          if (sensorChanges) {
            this.#logger.info(
              `Updating sensor {model: ${this.#sensors[key].model}, id: ${this.#sensors[key].id}}`,
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
          } catch (err) {
            this.#logger.error(
              `Could not delete sensor {model: ${this.#sensors[key]?.model}, id: ${
                this.#sensors[key]?.id
              }}. ${err}`,
            );
          }
        }
      }

      profiler.done({
        message: "SensorList regenerate time",
        level: "debug",
      });
    } finally {
      this.#isUpdating = false;
    }
    return this;
  }

  updateDataStoresAsync = async () => {
    await this.#touchAllSensorsAsync(async (sensor) => {
      sensor.updateDataStoresAsync();
    });
  };

  async [Symbol.asyncDispose]() {
    this.#listenerCleanupFunction();
    await this.#touchAllSensorsAsync(async (sensor) => this.#disposeSensorAsync(sensor));
  }

  async getAvailableDevices(
    model: string,
    address?: string,
    filterUsed: boolean = true,
    subcontrollerId?: number,
  ): Promise<AvailableDevice[]> {
    switch (model) {
      case Models.BME280:
        return this.#getStaticDevices([Models.BME280], BME280_ADDRESSES, null, address, filterUsed);
      case Models.ESP32_BME280:
        return this.#getStaticDevices(
          [Models.ESP32_BME280],
          BME280_ADDRESSES,
          null,
          address,
          filterUsed,
          subcontrollerId,
        );
      case Models.ADS1115:
      case Models.CAPACITIVE_MOISTURE_SENSOR:
        return this.#getStaticDevices(
          [Models.ADS1115, Models.CAPACITIVE_MOISTURE_SENSOR],
          ADS1115_ADDRESSES,
          ADS1115_PINS,
          address,
          filterUsed,
        );
      case Models.ESP32_ADS1115:
      case Models.ESP32_CAPACITIVE_MOISTURE_SENSOR:
        return this.#getStaticDevices(
          [Models.ESP32_ADS1115, Models.ESP32_CAPACITIVE_MOISTURE_SENSOR],
          ADS1115_ADDRESSES,
          ADS1115_PINS,
          address,
          filterUsed,
          subcontrollerId,
        );
      case Models.DS18B20:
        return this.#getDS18B20Devices(Models.DS18B20, address, filterUsed);
      case Models.ESP32_DS18B20:
        return this.#getDS18B20Devices(Models.ESP32_DS18B20, address, filterUsed, subcontrollerId);
      default:
        return [];
    }
  }

  async addSensorAsync(sensor: SDBSensor): Promise<void> {
    await this.#sensorsRepository.addAsync(sensor);
    await this.#eventBus.publishAsync(new SensorModifiedEvent({}));
  }

  async updateSensorAsync(sensor: SDBSensor): Promise<void> {
    await this.#sensorsRepository.updateAsync(sensor);
    await this.#eventBus.publishAsync(new SensorModifiedEvent({}));
  }

  async deleteSensorAsync(sensorId: number): Promise<void> {
    await this.#sensorsRepository.deleteAsync(sensorId);
    await this.#eventBus.publishAsync(new SensorModifiedEvent({}));
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
        newSensor = await BME280.createInstanceAsync(
          sensor,
          this.#sensorsRepository,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#cacheBucketMinutes,
          this.#logger,
        );
        break;

      case Models.ESP32_BME280.toLowerCase():
        if (!sensor.subcontrollerId) {
          throw new SensorListError("ESP32 BME280 external address cannot be null");
        }
        if (!sensor.address) {
          throw new SensorListError("ESP32 BME280 sensor address cannot be null");
        }
        subcontroller = (await this.#subcontrollersRepository.getAllAsync()).find(
          (device) => device.id == sensor.subcontrollerId,
        );
        if (!subcontroller) {
          throw new SensorListError(
            `ESP32 BME280 references non-existent subcontrollerId ${sensor.subcontrollerId}.`,
          );
        }
        newSensor = await ESP32_BME280.createInstanceAsync(
          sensor,
          subcontroller,
          this.#sensorsRepository,
          this.#mdnsService,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#cacheBucketMinutes,
          this.#logger,
        );
        break;

      case Models.DS18B20.toLowerCase():
        if (!sensor.address) {
          throw new SensorListError("DS18B20 sensor address cannot be null");
        }
        newSensor = await DS18B20.createInstanceAsync(
          sensor,
          this.#sensorsRepository,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#cacheBucketMinutes,
          this.#logger,
        );
        break;

      case Models.ESP32_DS18B20.toLowerCase():
        if (!sensor.subcontrollerId) {
          throw new SensorListError("ESP32 DS18B20 external address cannot be null");
        }
        if (!sensor.address) {
          throw new SensorListError("ESP32 DS18B20 sensor address cannot be null");
        }
        subcontroller = (await this.#subcontrollersRepository.getAllAsync()).find(
          (device) => device.id == sensor.subcontrollerId,
        );
        if (!subcontroller) {
          throw new SensorListError(
            `ESP32 DS18B20 references non-existent subcontrollerId ${sensor.subcontrollerId}.`,
          );
        }
        newSensor = await ESP32_DS18B20.createInstanceAsync(
          sensor,
          subcontroller,
          this.#sensorsRepository,
          this.#mdnsService,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#cacheBucketMinutes,
          this.#logger,
        );
        break;

      case Models.ADS1115.toLowerCase():
        if (!sensor.address) {
          throw new SensorListError("ADS1115 sensor address cannot be null");
        }
        if (!sensor.pin) {
          throw new SensorListError("ADS1115 sensor pin cannot be null");
        }
        newSensor = await ADS1115.createInstanceAsync(
          sensor,
          ReadingType.voltage,
          "1",
          this.#sensorsRepository,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#cacheBucketMinutes,
          this.#logger,
        );
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
        subcontroller = (await this.#subcontrollersRepository.getAllAsync()).find(
          (device) => device.id == sensor.subcontrollerId,
        );
        if (!subcontroller) {
          throw new SensorListError(
            `ESP32 ADS1115 references non-existent subcontrollerId ${sensor.subcontrollerId}.`,
          );
        }
        newSensor = await ESP32_ADS1115.createInstanceAsync(
          sensor,
          subcontroller,
          ReadingType.voltage,
          "1",
          this.#sensorsRepository,
          this.#mdnsService,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#cacheBucketMinutes,
          this.#logger,
        );
        break;

      case Models.CAPACITIVE_MOISTURE_SENSOR.toLowerCase():
        if (!sensor.address) {
          throw new SensorListError("Capacitive Moisture Sensor address cannot be null");
        }
        if (!sensor.pin) {
          throw new SensorListError("Capacitive Moisture Sensor pin cannot be null");
        }
        newSensor = await CapacitiveMoistureSensor.createInstanceAsync(
          sensor,
          this.#sensorsRepository,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#cacheBucketMinutes,
          this.#logger,
        );
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
        subcontroller = (await this.#subcontrollersRepository.getAllAsync()).find(
          (device) => device.id == sensor.subcontrollerId,
        );
        if (!subcontroller) {
          throw new SensorListError(
            `ESP32 Capacitive Moisture Sensor references non-existent subcontrollerId ${sensor.subcontrollerId}.`,
          );
        }
        newSensor = await ESP32_CapacitiveMoistureSensor.createInstanceAsync(
          sensor,
          subcontroller,
          this.#sensorsRepository,
          this.#mdnsService,
          this.#maxCacheSize,
          this.#initialCacheLookback,
          this.#cacheBucketMinutes,
          this.#logger,
        );
        break;
      default:
        throw new SensorListError(`Unrecognized sensor model ${sensor.model}`);
    }
    if (newSensor) {
      this.#sensors[sensor.id] = newSensor;
    }
  }

  async #disposeSensorAsync(sensor: SensorBase) {
    await this.#sensors[sensor.id]![Symbol.asyncDispose]();
    delete this.#sensors[sensor.id];
  }

  async #getStaticDevices(
    modelGroup: string[],
    allAddresses: string[],
    allPins: string[] | null,
    address?: string,
    filterUsed: boolean = true,
    subcontrollerId?: number,
  ): Promise<AvailableDevice[]> {
    const addresses = address ? [address] : allAddresses;
    const subcontrollerIds = await this.#resolveSubcontrollerIds(modelGroup[0]!, subcontrollerId);

    return subcontrollerIds.flatMap((candidateSubcontrollerId) => {
      return addresses
        .map((candidateAddress) => {
          const usedPins = this.#getUsedPins(
            modelGroup,
            candidateAddress,
            candidateSubcontrollerId,
          );
          const availablePins =
            allPins == null
              ? null
              : filterUsed
                ? allPins.filter((pin) => !usedPins.includes(pin))
                : [...allPins];

          const isUsedWithoutPins =
            allPins == null &&
            filterUsed &&
            this.#isAddressUsed(modelGroup, candidateAddress, candidateSubcontrollerId);

          return {
            alias: null,
            address: candidateAddress,
            pins: availablePins,
            subcontrollerId: candidateSubcontrollerId,
            externalId: null,
            isUsedWithoutPins,
          };
        })
        .filter((device) => {
          if (device.isUsedWithoutPins) {
            return false;
          }
          if (device.pins == null) {
            return true;
          }
          return device.pins.length > 0;
        })
        .map(({ isUsedWithoutPins: _isUsedWithoutPins, ...device }) => device);
    });
  }

  async #getDS18B20Devices(
    model: string,
    address?: string,
    filterUsed: boolean = true,
    subcontrollerId?: number,
  ): Promise<AvailableDevice[]> {
    if (model === Models.DS18B20) {
      const addresses = await DS18B20.getAddressesAsync();
      return addresses
        .filter((candidateAddress) => (address ? candidateAddress === address : true))
        .filter((candidateAddress) => {
          return !filterUsed || !this.#isAddressUsed([Models.DS18B20], candidateAddress, null);
        })
        .map((candidateAddress) => ({
          alias: null,
          address: candidateAddress,
          pins: null,
          subcontrollerId: null,
          externalId: null,
        }));
    }

    const subcontrollers = await this.#subcontrollersRepository.getAllAsync();
    const relevantSubcontrollers = subcontrollerId
      ? subcontrollers.filter((device) => device.id === subcontrollerId)
      : subcontrollers;

    const devices = await Promise.all(
      relevantSubcontrollers.map(async (device) => {
        const ipAddress = this.#mdnsService.getIPAddressByHostName(device.hostName);
        if (!ipAddress) {
          return [] as AvailableDevice[];
        }

        const addresses = await ESP32_DS18B20.getAddressesAsync(ipAddress);
        return addresses
          .filter((candidateAddress) => (address ? candidateAddress === address : true))
          .filter((candidateAddress) => {
            return (
              !filterUsed ||
              !this.#isAddressUsed([Models.ESP32_DS18B20], candidateAddress, device.id)
            );
          })
          .map((candidateAddress) => ({
            alias: device.name,
            address: candidateAddress,
            pins: null,
            subcontrollerId: device.id,
            externalId: null,
          }));
      }),
    );

    return devices.flat();
  }

  async #resolveSubcontrollerIds(
    model: string,
    subcontrollerId?: number,
  ): Promise<Array<number | null>> {
    if (!model.startsWith("ESP32_")) {
      return [null];
    }

    if (subcontrollerId != null) {
      return [subcontrollerId];
    }

    const subcontrollers = await this.#subcontrollersRepository.getAllAsync();
    return subcontrollers.map((device) => device.id);
  }

  #getUsedPins(modelGroup: string[], address: string, subcontrollerId: number | null): string[] {
    return Object.values(this.sensorData)
      .filter((sensor) => modelGroup.includes(sensor.model))
      .filter((sensor) => sensor.address === address)
      .filter((sensor) => (sensor.subcontrollerId ?? null) === subcontrollerId)
      .map((sensor) => sensor.pin)
      .filter((pin): pin is string => pin != null);
  }

  #isAddressUsed(modelGroup: string[], address: string, subcontrollerId: number | null): boolean {
    return Object.values(this.sensorData)
      .filter((sensor) => modelGroup.includes(sensor.model))
      .some(
        (sensor) =>
          sensor.address === address && (sensor.subcontrollerId ?? null) === subcontrollerId,
      );
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
