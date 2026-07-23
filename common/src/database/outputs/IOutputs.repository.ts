/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBOutput } from "@sproot/sproot-common/src/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";
import { IOutputBase, ControlMode } from "@sproot/sproot-common/src/outputs/IOutputBase";
import {
  OutputDataQueryRequest,
  OutputDataQueryResponse,
  DeviceDataQueryRow,
} from "@sproot/api/v2/QueryTypes";

export interface IOutputsRepository {
  getAllAsync(): Promise<SDBOutput[]>;
  getByIdAsync(id: number): Promise<SDBOutput[]>;
  addAsync(output: SDBOutput): Promise<number>;
  updateAsync(output: SDBOutput): Promise<void>;
  deleteAsync(id: number): Promise<void>;
  updateLastOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void>;
  getLastOutputStateAsync(outputId: number): Promise<SDBOutputState[]>;
  addOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void>;
  getOutputStatesAsync(
    output: IOutputBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean,
  ): Promise<SDBOutputState[]>;
  getBucketedOutputStatesAsync(
    output: IOutputBase | { id: number },
    since: Date,
    minutes: number,
    bucketMinutes: number,
    toIsoString: boolean,
  ): Promise<SDBOutputState[]>;
  getDataAsync(request: OutputDataQueryRequest): Promise<OutputDataQueryResponse>;
}

export class MockOutputsRepository implements IOutputsRepository {
  async getAllAsync(): Promise<SDBOutput[]> {
    return [];
  }
  async getByIdAsync(_id: number): Promise<SDBOutput[]> {
    return [];
  }
  async addAsync(_output: SDBOutput): Promise<number> {
    return 0;
  }
  async updateAsync(_output: SDBOutput): Promise<void> {
    return;
  }
  async deleteAsync(_id: number): Promise<void> {
    return;
  }
  async updateLastOutputStateAsync(_output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return;
  }
  async getLastOutputStateAsync(_outputId: number): Promise<SDBOutputState[]> {
    return [];
  }
  async addOutputStateAsync(_output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return;
  }
  async getOutputStatesAsync(
    _output: IOutputBase | { id: number },
    _since: Date,
    _minutes: number,
    _toIsoString: boolean,
  ): Promise<SDBOutputState[]> {
    return [];
  }
  async getBucketedOutputStatesAsync(
    _output: IOutputBase | { id: number },
    _since: Date,
    _minutes: number,
    _bucketMinutes: number,
    _toIsoString: boolean,
  ): Promise<SDBOutputState[]> {
    return [];
  }
  async getDataAsync(_request: OutputDataQueryRequest): Promise<OutputDataQueryResponse> {
    return { xAxis: { field: "time", values: [] }, data: {} as DeviceDataQueryRow };
  }
}
