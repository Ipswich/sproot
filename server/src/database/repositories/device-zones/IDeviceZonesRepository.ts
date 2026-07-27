import { SDBDeviceZone } from "@sproot/common/database/SDBDeviceZone";

export interface IDeviceZonesRepository {
  getAllAsync(): Promise<SDBDeviceZone[]>;
  addAsync(name: string): Promise<number>;
  updateAsync(deviceZone: SDBDeviceZone): Promise<void>;
  deleteAsync(id: number): Promise<void>;
}
