/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBSensor } from "@sproot/common/src/database/SDBSensor";
import { SDBReading } from "@sproot/common/src/database/SDBReading";
import { ISensorBase } from "@sproot/common/src/sensors/ISensorBase";
import {
  SensorDataQueryRequest,
  SensorDataQueryResponse,
  DeviceDataQueryRow,
} from "@sproot/api/v2/QueryTypes";

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

export class MockSensorsRepository implements ISensorsRepository {
  async getAllAsync(): Promise<SDBSensor[]> {
    return [];
  }
  async getByIdAsync(_id: number): Promise<SDBSensor[]> {
    return [];
  }
  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    return [];
  }
  async addAsync(_sensor: SDBSensor): Promise<void> {
    return;
  }
  async updateAsync(_sensor: SDBSensor): Promise<void> {
    return;
  }
  async updateSensorCalibrationAsync(
    _sensorId: number,
    _lowCalibrationPoint: number,
    _highCalibrationPoint: number,
  ): Promise<void> {
    return;
  }
  async deleteAsync(_id: number): Promise<void> {
    return;
  }
  async addSensorReadingAsync(_sensor: ISensorBase): Promise<void> {
    return;
  }
  async getSensorReadingsAsync(
    _sensor: ISensorBase | { id: number },
    _since: Date,
    _minutes: number,
    _toIsoString: boolean,
  ): Promise<SDBReading[]> {
    return [];
  }
  async getBucketedSensorReadingsAsync(
    _sensor: ISensorBase | { id: number },
    _since: Date,
    _minutes: number,
    _bucketMinutes: number,
    _toIsoString: boolean,
  ): Promise<SDBReading[]> {
    return [];
  }
  async getDataAsync(_request: SensorDataQueryRequest): Promise<SensorDataQueryResponse> {
    return { xAxis: { field: "time", values: [] }, data: {} as DeviceDataQueryRow };
  }
}
