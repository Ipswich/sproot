import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { ADS1115, Ads1115Device } from "./ADS1115";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import winston from "winston";
import { SensorBase } from "./base/SensorBase";

export class CapacitiveMoistureSensor extends SensorBase {
  static readonly GAIN = "1";
  // These values are based on 0 to 32767 - signed 16 bit range
  // Also worth calling out that these values are "inverted" for moisture - lower readings are
  // wetter, higher readings are drier.
  static readonly MAX_SENSOR_READING = 29000;
  static readonly MIN_SENSOR_READING = 10000;
  static readonly DEFAULT_LOW_CALIBRATION_VOLTAGE = 14000;
  static readonly DEFAULT_HIGH_CALIBRATION_VOLTAGE = 21000;

  static async createInstanceAsync(
    sdbSensor: SDBSensor,
    sprootDB: ISprootDB,
    maxCacheSize: number,
    initialCacheLookback: number,
    maxChartDataSize: number,
    chartDataPointInterval: number,
    logger: winston.Logger,
  ): Promise<CapacitiveMoistureSensor | null> {
    const sensor = new CapacitiveMoistureSensor(
      sdbSensor,
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      logger,
    );
    return sensor.initializeAsync(ADS1115.MAX_SENSOR_READ_TIME);
  }

  private constructor(
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
      sprootDB,
      maxCacheSize,
      initialCacheLookback,
      maxChartDataSize,
      chartDataPointInterval,
      [ReadingType.moisture],
      logger,
    );

    this.lowCalibrationPoint = sdbSensor.lowCalibrationPoint;
    this.highCalibrationPoint = sdbSensor.highCalibrationPoint;
  }

  override async takeReadingAsync(): Promise<void> {
    try {
      const rawReading = await Ads1115Device.getRawReadingAsync(this.pin, Number(this.address), CapacitiveMoistureSensor.GAIN);
      await this.#recalibrateAsync(rawReading);

      const normalizedReading = this.#normalizeRawReading(rawReading);
      if (isNaN(normalizedReading)) {
        this.logger.error(
          `${this.model} { id: ${this.id} } returned an invalid reading: { raw: ${rawReading}, normalized: ${normalizedReading} }`,
        );
        return;
      }

      this.lastReading[ReadingType.moisture] = String(normalizedReading);
      this.lastReadingTime = new Date();
    } catch (error) {
      this.logger.error(`Failed to read ${this.model} { id: ${this.id} }. ${error}`);
    }
  }

  #normalizeRawReading(rawReading: number) {
    const MAX_READINGS_COUNT = 10; // Maximum number of readings to consider for averaging
    const MAX_HISTORICAL_READING_AGE = 600000; // 10 minutes in milliseconds

    const rawAsPercentMoisture = this.#getPercentMoisture(rawReading);
    const historicalReadings = this.getCachedReadings(-MAX_READINGS_COUNT);

    // Remove any stale readings (don't want to have ancient values on startup)
    const now = new Date();
    const relevantReadings =
      (historicalReadings.moisture ?? [])
        .filter((reading) => {
          const readingTime = new Date(reading.logTime);
          return now.getTime() - readingTime.getTime() <= MAX_HISTORICAL_READING_AGE;
        })
        .map((reading) => parseFloat(reading.data)) ?? [];

    // Take an average
    const filteredSum = relevantReadings.reduce((acc, reading) => acc + reading, 0);
    const averageReading = (filteredSum + rawAsPercentMoisture) / (relevantReadings.length + 1);
    if (isNaN(averageReading)) {
      this.logger.error(
        `Average reading is NaN - ${this.model} { id: ${this.id} }, raw: ${rawReading}, percent: ${rawAsPercentMoisture}, historical: ${historicalReadings}, relevant: ${relevantReadings}, filteredSum: ${filteredSum}, average: ${averageReading}`,
      );
    }
    return averageReading;
  }

  async #recalibrateAsync(voltage: number) {
    // Set defaults if calibration points are not set.
    // This should give us a big ol range as a starting point, as opposed to a small one that needs to be built
    let shouldUpdateCalibration = false;
    if (this.lowCalibrationPoint == null) {
      shouldUpdateCalibration = true;
      this.lowCalibrationPoint = CapacitiveMoistureSensor.DEFAULT_LOW_CALIBRATION_VOLTAGE;
    }
    if (this.highCalibrationPoint == null) {
      shouldUpdateCalibration = true;
      this.highCalibrationPoint = CapacitiveMoistureSensor.DEFAULT_HIGH_CALIBRATION_VOLTAGE;
    }

    // Update calibration points, maxing if necessary
    if (voltage < this.lowCalibrationPoint) {
      shouldUpdateCalibration = true;
      this.lowCalibrationPoint =
        voltage < CapacitiveMoistureSensor.MIN_SENSOR_READING
          ? CapacitiveMoistureSensor.MIN_SENSOR_READING
          : voltage;
    } else if (voltage > this.highCalibrationPoint) {
      shouldUpdateCalibration = true;
      this.highCalibrationPoint =
        voltage > CapacitiveMoistureSensor.MAX_SENSOR_READING
          ? CapacitiveMoistureSensor.MAX_SENSOR_READING
          : voltage;
    }

    if (shouldUpdateCalibration) {
      this.logger.info(
        `${this.model} { id: ${this.id} } recalibrated. New low: ${this.lowCalibrationPoint}, new high: ${this.highCalibrationPoint}`,
      );
      await this.sprootDB.updateSensorCalibrationAsync(
        this.id,
        this.lowCalibrationPoint,
        this.highCalibrationPoint,
      );
    }
  }

  // Two points - a low and a high - meaning this is linear. That's not strictly accurate,
  // as I'm lead to believe that the curve of moisture content for these sensors is more of
  // a power curve, but in order to map that accurately you'd need to manually calibrate each
  // sensor before placement, which seems like a lot of work. Ultimately, the intent of
  // sensors like these is to basically be like "SHOULD WATER OR NAH?", rather than have a
  // strictly scientifically accurate reading.
  #getPercentMoisture(rawReading: number): number {
    if (this.lowCalibrationPoint == null || this.highCalibrationPoint == null) {
      throw new Error(
        `Calibration points not set for ${this.model} { id: ${this.id} }. Please calibrate the sensor first.`,
      );
    }
    if (
      rawReading < CapacitiveMoistureSensor.MIN_SENSOR_READING ||
      rawReading > CapacitiveMoistureSensor.MAX_SENSOR_READING
    ) {
      throw new Error(
        `Invalid reading for ${this.model} { id: ${this.id} }: ${this.lastReading[ReadingType.moisture]}`,
      );
    }

    // Needs to be inverted - these sensors return a higher value when the soil is drier
    return (
      100 -
      ((rawReading - this.lowCalibrationPoint!) /
        (this.highCalibrationPoint! - this.lowCalibrationPoint!)) *
      100
    );
  }
}
