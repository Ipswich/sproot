import { I2CBus, PromisifiedBus } from "i2c-bus";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SensorBase } from "./base/SensorBase";
import winston from "winston";

class BME280 extends SensorBase {
  readonly MAX_SENSOR_READ_TIME = 3500;
  #i2cBus: I2CBus;
  constructor(
    sdbsensor: SDBSensor,
    i2cBus: I2CBus,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    super(
      sdbsensor,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      [ReadingType.humidity, ReadingType.temperature, ReadingType.pressure],
      logger,
    );
    this.#i2cBus = i2cBus;
  }

  override async initAsync(): Promise<BME280 | null> {
    return this.createSensorAsync(this.MAX_SENSOR_READ_TIME);
  }

  override async takeReadingAsync(): Promise<void> {
    const profiler = this.logger.startTimer();
    await BME280Device.open(
      {
        i2cAddress: Number(this.address),
      },
      this.#i2cBus,
    )
      .then(async (sensor) => {
        const reading = await sensor.readAsync();
        this.lastReading[ReadingType.temperature] = String(reading.temperature);
        this.lastReading[ReadingType.humidity] = String(reading.humidity);
        this.lastReading[ReadingType.pressure] = String(reading.pressure);
        this.lastReadingTime = new Date();
      })
      .catch((err) => {
        this.logger.error(`Failed to read BME280 sensor ${this.id}. ${err}`);
      });
    profiler.done({
      message: `Reading time for sensor {BME280, id: ${this.id}, address: ${this.address}`,
      level: "debug",
    });
  }

  override disposeAsync(): Promise<void> {
    this.internalDispose();
    return Promise.resolve();
  }
}

export class BME280Device {
  static readonly DEFAULT_I2C_BUS = 1;
  static readonly DEFAULT_I2C_ADDRESS = 0x77;

  static readonly OVERSAMPLE = {
    SKIPPED: 0,
    X1: 1,
    X2: 2,
    X4: 3,
    X8: 4,
    X16: 5,
  };

  static readonly FILTER = {
    OFF: 0,
    F2: 1,
    F4: 2,
    F8: 3,
    F16: 4,
  };

  static readonly STANDBY = {
    MS_0_5: 0,
    MS_62_5: 1,
    MS_125: 2,
    MS_250: 3,
    MS_500: 4,
    MS_1000: 5,
    MS_10: 6,
    MS_20: 7,
  };

  static readonly MODE = {
    SLEEP: 0,
    FORCED: 1,
    NORMAL: 3,
  };

  static readonly REGS = {
    TP_COEFFICIENT: 0x88,
    CHIP_ID: 0xd0,
    RESET: 0xe0,
    H_COEFFICIENT: 0xe1,
    CTRL_HUM: 0xf2,
    STATUS: 0xf3,
    CTRL_MEAS: 0xf4,
    CONFIG: 0xf5,
    DATA: 0xf7,
  };

  static readonly REG_LENGTHS = {
    TP_COEFFICIENT: 26,
    H_COEFFICIENT: 7,
    DATA: 8,
  };

  static readonly CHIP_ID = 0x60;
  static readonly SOFT_RESET_COMMAND = 0xb6;

  // STATUS register
  static readonly STATUS = {
    IM_UPDATE_BIT: 0x01,
    MEASURING_BIT: 0x08,
  };

  // CTRL_HUM register
  static readonly CTRL_HUM = {
    OSRS_H_MASK: 0x07,
    OSRS_H_POS: 0x00,
  };

  // CTRL_MEAS register
  static readonly CTRL_MEAS = {
    MODE_POS: 0x00,
    MODE_MASK: 0x03,
    OSRS_P_POS: 0x02,
    OSRS_T_POS: 0x05,
  };

  // CONFIG register
  static readonly CONFIG = {
    FILTER_MASK: 0x1c,
    FILTER_POS: 2,
    STANDBY_MASK: 0xe0,
    STANDBY_POS: 5,
  };

  static delay = (milliseconds: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, milliseconds + 1));

  static open = async (options: Partial<BME280Options>, i2cBus: I2CBus) => {
    await Promise.resolve();
    options = options || {};
    BME280Device.validateOpenOptions(options);
    options = Object.assign(
      {
        i2cAddress: BME280Device.DEFAULT_I2C_ADDRESS,
        humidityOversampling: BME280Device.OVERSAMPLE.X1,
        pressureOversampling: BME280Device.OVERSAMPLE.X1,
        temperatureOversampling: BME280Device.OVERSAMPLE.X1,
        filterCoefficient: BME280Device.FILTER.OFF,
        standby: BME280Device.STANDBY.MS_0_5,
        forcedMode: false,
      },
      options,
    );
    const bme280I2c = new Bme280I2c(i2cBus, options as BME280Options);
    await bme280I2c.initializeAsync();
    return new Bme280Device(bme280I2c);
  };

  static validateOpenOptions = (options: Partial<BME280Options>) => {
    if (typeof options !== "object") {
      throw new Error("Expected options to be of type object." + ` Got type ${typeof options}.`);
    }

    if (
      options.hasOwnProperty("i2cAddress") &&
      (!Number.isSafeInteger(options.i2cAddress) ||
        options.i2cAddress < 0 ||
        options.i2cAddress > 0x7f)
    ) {
      throw new Error(
        "Expected i2cAddress to be an integer" + ` >= 0 and <= 0x7f. Got "${options.i2cAddress}".`,
      );
    }

    if (
      options.hasOwnProperty("humidityOversampling") &&
      !Object.values(BME280Device.OVERSAMPLE).includes(options.humidityOversampling)
    ) {
      throw new Error(
        "Expected humidityOversampling to be a value from" +
          ` Enum OVERSAMPLE. Got "${options.humidityOversampling}".`,
      );
    }

    if (
      options.hasOwnProperty("pressureOversampling") &&
      !Object.values(BME280Device.OVERSAMPLE).includes(options.pressureOversampling)
    ) {
      throw new Error(
        "Expected pressureOversampling to be a value from" +
          ` Enum OVERSAMPLE. Got "${options.pressureOversampling}".`,
      );
    }

    if (
      options.hasOwnProperty("temperatureOversampling") &&
      !Object.values(BME280Device.OVERSAMPLE).includes(options.temperatureOversampling)
    ) {
      throw new Error(
        "Expected temperatureOversampling to be a value from" +
          ` Enum OVERSAMPLE. Got "${options.temperatureOversampling}".`,
      );
    }

    if (
      options.hasOwnProperty("standby") &&
      !Object.values(BME280Device.STANDBY).includes(options.standby)
    ) {
      throw new Error(
        "Expected standby to be a value from Enum" + ` STANDBY. Got "${options.standby}".`,
      );
    }

    if (
      options.hasOwnProperty("filterCoefficient") &&
      !Object.values(BME280Device.OVERSAMPLE).includes(options.filterCoefficient)
    ) {
      throw new Error(
        "Expected filterCoefficient to be a value from Enum" +
          ` FILTER. Got "${options.filterCoefficient}".`,
      );
    }

    if (options.hasOwnProperty("forcedMode") && typeof options.forcedMode !== "boolean") {
      throw new Error(
        "Expected forcedMode to be a value of type" +
          ` boolean. Got type "${typeof options.forcedMode}".`,
      );
    }
  };
}

type BME280Options = {
  i2cAddress: number;
  humidityOversampling: number;
  pressureOversampling: number;
  temperatureOversampling: number;
  filterCoefficient: number;
  standby: number;
  forcedMode: boolean;
};

class Bme280I2c {
  #i2cBus: PromisifiedBus;
  #opts: BME280Options;
  #forcedMode: boolean = false;
  #coefficients: null | {
    t1: number;
    t2: number;
    t3: number;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    p5: number;
    p6: number;
    p7: number;
    p8: number;
    p9: number;
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };

  constructor(i2cBus: I2CBus, options: BME280Options) {
    this.#i2cBus = i2cBus.promisifiedBus();
    this.#opts = options;
    this.#coefficients = null;
  }

  readByteAsync(register: number) {
    return this.#i2cBus.readByte(this.#opts.i2cAddress, register);
  }

  writeByteAsync(register: number, byte: number) {
    return this.#i2cBus.writeByte(this.#opts.i2cAddress, register, byte);
  }

  readI2cBlockAsync(register: number, length: number, buffer: Buffer) {
    return this.#i2cBus.readI2cBlock(this.#opts.i2cAddress, register, length, buffer);
  }

  async checkChipId(tries = 5): Promise<void> {
    return this.readByteAsync(BME280Device.REGS.CHIP_ID)
      .then((chipId) => {
        if (chipId !== BME280Device.CHIP_ID) {
          return Promise.reject(
            new Error(
              `Expected bme280 chip id to be 0x${BME280Device.CHIP_ID.toString(16)}` +
                `, got chip id 0x${chipId.toString(16)}.`,
            ),
          );
        }
      })
      .catch((err) => {
        if (tries > 1) {
          return BME280Device.delay(1).then((_) => this.checkChipId(tries - 1));
        }
        return Promise.reject(err);
      });
  }

  softResetAsync() {
    return this.writeByteAsync(BME280Device.REGS.RESET, BME280Device.SOFT_RESET_COMMAND);
  }

  async waitForImageRegisterUpdateAsync(tries = 5): Promise<void> {
    await BME280Device.delay(2);
    const statusReg = await this.readByteAsync(BME280Device.REGS.STATUS);
    if ((statusReg & BME280Device.STATUS.IM_UPDATE_BIT) !== 0) {
      if (tries - 1 > 0) {
        return this.waitForImageRegisterUpdateAsync(tries - 1);
      }
      return Promise.reject(new Error("Image register update failed."));
    }
  }

  async readCoefficientsAsync() {
    const tpRegs = Buffer.alloc(BME280Device.REG_LENGTHS.TP_COEFFICIENT);
    const hRegs = Buffer.alloc(BME280Device.REG_LENGTHS.H_COEFFICIENT);

    await this.readI2cBlockAsync(
      BME280Device.REGS.TP_COEFFICIENT,
      BME280Device.REG_LENGTHS.TP_COEFFICIENT,
      tpRegs,
    );
    await this.readI2cBlockAsync(
      BME280Device.REGS.H_COEFFICIENT,
      BME280Device.REG_LENGTHS.H_COEFFICIENT,
      hRegs,
    );
    this.#coefficients = Object.freeze({
      t1: tpRegs.readUInt16LE(0),
      t2: tpRegs.readInt16LE(2),
      t3: tpRegs.readInt16LE(4),

      p1: tpRegs.readUInt16LE(6),
      p2: tpRegs.readInt16LE(8),
      p3: tpRegs.readInt16LE(10),
      p4: tpRegs.readInt16LE(12),
      p5: tpRegs.readInt16LE(14),
      p6: tpRegs.readInt16LE(16),
      p7: tpRegs.readInt16LE(18),
      p8: tpRegs.readInt16LE(20),
      p9: tpRegs.readInt16LE(22),

      h1: tpRegs.readUInt8(25),
      h2: hRegs.readInt16LE(0),
      h3: hRegs.readUInt8(2),
      h4: (hRegs.readInt8(3) * 16) | (hRegs[4]! & 0xf),
      h5: (hRegs.readInt8(5) * 16) | (hRegs[4]! >> 4),
      h6: hRegs.readInt8(6),
    });
  }

  async configureSettings() {
    // The following comment is from the BME280 datasheet (page 30, section
    // 5.4.6 Register 0xF5 "config"):
    //
    // Writes to the "config" register in normal mode may be ignored. In sleep
    // mode writes are not ignored.
    //
    // So ensure that the config register is set while in sleep mode before
    // setting the mode to normal/forced in the ctrl_meas register.
    const configReg = await this.readByteAsync(BME280Device.REGS.CONFIG);
    await this.writeByteAsync(
      BME280Device.REGS.CONFIG,
      (configReg & ~(BME280Device.CONFIG.STANDBY_MASK | BME280Device.CONFIG.FILTER_MASK)) |
        (this.#opts.standby << BME280Device.CONFIG.STANDBY_POS) |
        (this.#opts.filterCoefficient << BME280Device.CONFIG.FILTER_POS),
    );

    const ctrlHumReg = await this.readByteAsync(BME280Device.REGS.CTRL_HUM);
    await this.writeByteAsync(
      BME280Device.REGS.CTRL_HUM,
      (ctrlHumReg & ~BME280Device.CTRL_HUM.OSRS_H_MASK) |
        (this.#opts.humidityOversampling << BME280Device.CTRL_HUM.OSRS_H_POS),
    );

    const mode = this.#opts.forcedMode ? BME280Device.MODE.SLEEP : BME280Device.MODE.NORMAL;

    await this.writeByteAsync(
      BME280Device.REGS.CTRL_MEAS,
      (this.#opts.temperatureOversampling << BME280Device.CTRL_MEAS.OSRS_T_POS) |
        (this.#opts.pressureOversampling << BME280Device.CTRL_MEAS.OSRS_P_POS) |
        (mode << BME280Device.CTRL_MEAS.MODE_POS),
    );
  }

  async initializeAsync() {
    return this.checkChipId()
      .then((_) => this.softResetAsync())
      .then((_) => this.waitForImageRegisterUpdateAsync())
      .then((_) => this.readCoefficientsAsync())
      .then((_) => this.configureSettings())
      .then((_) => {
        if (!this.#forcedMode) {
          return BME280Device.delay(this.maximumMeasurementTime());
        }
      });
  }

  async readRawData() {
    const dataRegs = await this.readI2cBlockAsync(
      BME280Device.REGS.DATA,
      BME280Device.REG_LENGTHS.DATA,
      Buffer.alloc(BME280Device.REG_LENGTHS.DATA),
    );
    const regs = dataRegs.buffer;
    return {
      pressure: (regs[0]! << 12) | (regs[1]! << 4) | (regs[2]! >> 4),
      temperature: (regs[3]! << 12) | (regs[4]! << 4) | (regs[5]! >> 4),
      humidity: (regs[6]! << 8) | regs[7]!,
    };
  }

  async compensateTemperatureAsync(adcT: number) {
    if (this.#coefficients === null) {
      await this.readCoefficientsAsync();
    }
    const c = this.#coefficients;

    return (
      (adcT / 16384 - c!.t1 / 1024) * c!.t2 +
      (adcT / 131072 - c!.t1 / 8192) * (adcT / 131072 - c!.t1 / 8192) * c!.t3
    );
  }

  async compensateHumidityAsync(adcH: number, tFine: number) {
    if (this.#coefficients === null) {
      await this.readCoefficientsAsync();
    }
    const c = this.#coefficients;

    let h = tFine - 76800;
    h =
      (adcH - (c!.h4 * 64 + (c!.h5 / 16384) * h)) *
      ((c!.h2 / 65536) * (1 + (c!.h6 / 67108864) * h * (1 + (c!.h3 / 67108864) * h)));
    h = h * (1 - (c!.h1 * h) / 524288);

    if (h > 100) {
      h = 100;
    } else if (h < 0) {
      h = 0;
    }

    return h;
  }

  async compensatePressureAsying(adcP: number, tFine: number) {
    if (this.#coefficients === null) {
      await this.readCoefficientsAsync();
    }
    const c = this.#coefficients;

    let var1 = tFine / 2 - 64000;
    let var2 = (var1 * var1 * c!.p6) / 32768;
    var2 = var2 + var1 * c!.p5 * 2;
    var2 = var2 / 4 + c!.p4 * 65536;
    var1 = ((c!.p3 * var1 * var1) / 524288 + c!.p2 * var1) / 524288;
    var1 = (1 + var1 / 32768) * c!.p1;

    if (var1 === 0) {
      return 0; // avoid exception caused by division by zero
    }

    let p = 1048576 - adcP;
    p = ((p - var2 / 4096) * 6250) / var1;
    var1 = (c!.p9 * p * p) / 2147483648;
    var2 = (p * c!.p8) / 32768;
    p = p + (var1 + var2 + c!.p7) / 16;

    return p;
  }

  async compensateRawDataAsync(rawData: {
    temperature: number;
    pressure: number;
    humidity: number;
  }) {
    const tFine = await this.compensateTemperatureAsync(rawData.temperature);
    let temperature: number | undefined = tFine / 5120;
    let pressure: number | undefined = await this.compensatePressureAsying(rawData.pressure, tFine);
    let humidity: number | undefined = await this.compensateHumidityAsync(rawData.humidity, tFine);

    if (this.#opts.temperatureOversampling === BME280Device.OVERSAMPLE.SKIPPED) {
      temperature = undefined;
    }

    pressure = pressure / 100;
    if (this.#opts.pressureOversampling === BME280Device.OVERSAMPLE.SKIPPED) {
      pressure = undefined;
    }

    if (this.#opts.humidityOversampling === BME280Device.OVERSAMPLE.SKIPPED) {
      humidity = undefined;
    }

    return {
      temperature: temperature,
      pressure: pressure,
      humidity: humidity,
    };
  }

  async readAsync() {
    const rawData = await this.readRawData();
    return this.compensateRawDataAsync(rawData);
  }

  async triggerForcedMeasurementAsync() {
    let ctrlMeas;
    let mode;
    const TRIES = 5;

    ctrlMeas = await this.readByteAsync(BME280Device.REGS.CTRL_MEAS);
    mode = (ctrlMeas & BME280Device.CTRL_MEAS.MODE_MASK) >> BME280Device.CTRL_MEAS.MODE_POS;

    if (mode === BME280Device.MODE.NORMAL) {
      throw new Error("triggerForcedMeasurement can't be invoked in normal mode.");
    }

    // If a forced measurement is currently progress give it a chance to
    // complete before proceeding.
    for (let i = 1; i <= TRIES && mode !== BME280Device.MODE.SLEEP; ++i) {
      const millis = Math.ceil(this.maximumMeasurementTime() / TRIES);
      await BME280Device.delay(millis);
      ctrlMeas = await this.readByteAsync(BME280Device.REGS.CTRL_MEAS);
      mode = (ctrlMeas & BME280Device.CTRL_MEAS.MODE_MASK) >> BME280Device.CTRL_MEAS.MODE_POS;
    }

    if (mode !== BME280Device.MODE.SLEEP) {
      throw new Error("Failed to trigger forced measurement, sensor not in SLEEP mode.");
    }

    await this.writeByteAsync(
      BME280Device.REGS.CTRL_MEAS,
      (ctrlMeas & ~BME280Device.CTRL_MEAS.MODE_MASK) |
        (BME280Device.MODE.FORCED << BME280Device.CTRL_MEAS.MODE_POS),
    );
  }

  typicalMeasurementTime() {
    const to = this.#opts.temperatureOversampling;
    const po = this.#opts.pressureOversampling;
    const ho = this.#opts.humidityOversampling;

    return Math.ceil(
      1 +
        (to === BME280Device.OVERSAMPLE.SKIPPED ? 0 : 2 * Math.pow(2, to - 1)) +
        (po === BME280Device.OVERSAMPLE.SKIPPED ? 0 : 2 * Math.pow(2, po - 1) + 0.5) +
        (ho === BME280Device.OVERSAMPLE.SKIPPED ? 0 : 2 * Math.pow(2, ho - 1) + 0.5),
    );
  }

  maximumMeasurementTime() {
    const to = this.#opts.temperatureOversampling;
    const po = this.#opts.pressureOversampling;
    const ho = this.#opts.humidityOversampling;

    return Math.ceil(
      1.25 +
        (to === BME280Device.OVERSAMPLE.SKIPPED ? 0 : 2.3 * Math.pow(2, to - 1)) +
        (po === BME280Device.OVERSAMPLE.SKIPPED ? 0 : 2.3 * Math.pow(2, po - 1) + 0.575) +
        (ho === BME280Device.OVERSAMPLE.SKIPPED ? 0 : 2.3 * Math.pow(2, ho - 1) + 0.575),
    );
  }
}

export class Bme280Device {
  #_bme280I2c: Bme280I2c;

  constructor(bme280I2c: Bme280I2c) {
    this.#_bme280I2c = bme280I2c;
  }

  readAsync() {
    return this.#_bme280I2c.readAsync();
  }

  triggerForcedMeasurementAsync() {
    return this.#_bme280I2c.triggerForcedMeasurementAsync();
  }

  typicalMeasurementTime() {
    return this.#_bme280I2c.typicalMeasurementTime();
  }

  maximumMeasurementTime() {
    return this.#_bme280I2c.maximumMeasurementTime();
  }
}

export { BME280 };
