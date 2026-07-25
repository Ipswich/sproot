/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBOutput } from "@sproot/common/src/database/SDBOutput";
import { SDBOutputState } from "@sproot/common/src/database/SDBOutputState";
import { IOutputBase, ControlMode } from "@sproot/common/src/outputs/IOutputBase";
import { OutputDataQueryRequest, OutputDataQueryResponse } from "@sproot/api/v2/QueryTypes";

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
