/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBDeviceZone } from "@sproot/sproot-common/src/database/SDBDeviceZone";

export interface IDeviceZonesRepository {
  getAllAsync(): Promise<SDBDeviceZone[]>;
  addAsync(name: string): Promise<number>;
  updateAsync(deviceZone: SDBDeviceZone): Promise<void>;
  deleteAsync(id: number): Promise<void>;
}

export class MockDeviceZonesRepository implements IDeviceZonesRepository {
  async getAllAsync(): Promise<SDBDeviceZone[]> {
    return [];
  }
  async addAsync(_name: string): Promise<number> {
    return 0;
  }
  async updateAsync(_deviceZone: SDBDeviceZone): Promise<void> {
    return;
  }
  async deleteAsync(_id: number): Promise<void> {
    return;
  }
}
