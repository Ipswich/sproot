import { ReadingType } from "@sproot/sensors/ReadingType";
import { ADS115 } from "./ADS1115";
import { ISprootDB } from "@sproot/database/ISprootDB";
import { SDBSensor } from "@sproot/database/SDBSensor";
import winston from "winston";

export class CapacitiveMoistureSensor extends ADS115 {
  static readonly GAIN = '1';
  // These values are based on 0 to 32767 - signed 16 bit range
  // Also worth calling out that these values are "inverted" for moisture - lower readings are
  // wetter, higher readings are drier.
  static readonly MAX_SENSOR_READING = 27000;
  static readonly MIN_SENSOR_READING = 11000;
  static readonly DEFAULT_LOW_CALIBRATION_VOLTAGE = 15000;
  static readonly DEFAULT_HIGH_CALIBRATION_VOLTAGE = 22000;

  #lowCalibrationPoint: number | null;
  #highCalibrationPoint: number | null;

  constructor(
    sdbSensor: SDBSensor,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ) {
    super(
      sdbSensor,
      ReadingType.moisture,
      CapacitiveMoistureSensor.GAIN,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger
    );

    this.#lowCalibrationPoint = sdbSensor.lowCalibrationPoint;
    this.#highCalibrationPoint = sdbSensor.highCalibrationPoint;
  }

  override async initAsync(): Promise<CapacitiveMoistureSensor | null> {
    const sensor = await this.createSensorAsync(ADS115.MAX_SENSOR_READ_TIME);
    const rawReading = await this.getReadingFromDeviceAsync();
    await this.recalibrateAsync(rawReading  );
    return sensor;
  }

  override async takeReadingAsync(): Promise<void> {
    try {
      const rawReading = await this.getReadingFromDeviceAsync();
      await this.recalibrateAsync(rawReading);
      this.lastReading[ReadingType.moisture] = String(this.getPercentMoisture(rawReading));
      this.lastReadingTime = new Date();
    } catch (error) {
      this.logger.error(error);
    }
  }

  protected async recalibrateAsync(rawReading: number) {
    // Set defaults if calibration points are not set.
    // This should give us a big ol range as a starting point, as opposed to a small one that needs to be built
    if (this.#lowCalibrationPoint === null) {
      await this.sprootDB.updateLowCalibrationPointAsync(CapacitiveMoistureSensor.DEFAULT_LOW_CALIBRATION_VOLTAGE)
      this.#lowCalibrationPoint = CapacitiveMoistureSensor.DEFAULT_LOW_CALIBRATION_VOLTAGE;
    }
    if (this.#highCalibrationPoint === null) {
      await this.sprootDB.updateHighCalibrationPointAsync(CapacitiveMoistureSensor.DEFAULT_HIGH_CALIBRATION_VOLTAGE)
      this.#highCalibrationPoint = CapacitiveMoistureSensor.DEFAULT_HIGH_CALIBRATION_VOLTAGE;
    }

    // Guard against too high or too low readings
    if (rawReading < CapacitiveMoistureSensor.MIN_SENSOR_READING || rawReading > CapacitiveMoistureSensor.MAX_SENSOR_READING) {
      throw new Error(`Invalid reading for moisture sensor ${this.id}: ${rawReading}. Must be between ${CapacitiveMoistureSensor.MIN_SENSOR_READING} and ${CapacitiveMoistureSensor.MAX_SENSOR_READING}.`);
    }

    // Update calibration points if the reading is outside the current range
    if (rawReading < this.#lowCalibrationPoint) {
      this.#lowCalibrationPoint = rawReading
      await this.sprootDB.updateLowCalibrationPointAsync(rawReading);
    }
    else if (rawReading > this.#highCalibrationPoint) {
      this.#highCalibrationPoint = rawReading
      await this.sprootDB.updateHighCalibrationPointAsync(rawReading);
    }
  }

  protected getPercentMoisture(rawReading: number): number {
    if (this.#lowCalibrationPoint === null || this.#highCalibrationPoint === null) {
      throw new Error(`Calibration points not set for moisture sensor ${this.id}. Please calibrate the sensor first.`);
    }
    if (rawReading < CapacitiveMoistureSensor.MIN_SENSOR_READING || rawReading > CapacitiveMoistureSensor.MAX_SENSOR_READING) {
      throw new Error(`Invalid reading for moisture sensor ${this.id}: ${this.lastReading[ReadingType.moisture]}`);
    }

    // Needs to be inverted - these sensors return a higher value when the soil is drier
    return 100 - (((rawReading - this.#lowCalibrationPoint!) / (this.#highCalibrationPoint! - this.#lowCalibrationPoint!)) * 100);
  }
}