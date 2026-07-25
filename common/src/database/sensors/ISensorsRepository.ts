/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBSensor } from "@sproot/common/src/database/SDBSensor";
import { SDBReading } from "@sproot/common/src/database/SDBReading";
import { ISensorBase } from "@sproot/common/src/sensors/ISensorBase";
import { SensorDataQueryRequest, SensorDataQueryResponse } from "@sproot/api/v2/QueryTypes";

export interface ISensorsRepository {
  getAllAsync(): Promise<SDBSensor[]>;
  getByIdAsync(id: number): Promise<SDBSensor[]>;
  getDS18B20AddressesAsync(): Promise<SDBSensor[]>;
  addAsync(sensor: SDBSensor): Promise<void>;
  updateAsync(sensor: SDBSensor): Promise<void>;
  updateSensorCalibrationAsync(
    sensorId: number,
    lowCalibrationPoint: number,
    highCalibrationPoint: number,
  ): Promise<void>;
  deleteAsync(id: number): Promise<void>;
  addSensorReadingAsync(sensor: ISensorBase): Promise<void>;
  getSensorReadingsAsync(
    sensor: ISensorBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean,
  ): Promise<SDBReading[]>;
  getBucketedSensorReadingsAsync(
    sensor: ISensorBase | { id: number },
    since: Date,
    minutes: number,
    bucketMinutes: number,
    toIsoString: boolean,
  ): Promise<SDBReading[]>;
  getDataAsync(request: SensorDataQueryRequest): Promise<SensorDataQueryResponse>;
}
